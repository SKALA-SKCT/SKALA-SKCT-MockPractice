import { useState } from 'react';
import { Link } from 'react-router-dom';
import { store } from '../store';
import { useAuth } from '../auth';
import { SECTIONS, type ProblemSet, type Section } from '../types';
import {
  buildItems,
  includedSections,
  makeRows,
  parseBulk,
  resizeRows,
  rowsFromItems,
  type RowsBySection,
} from '../admin/answerKey';

// 영역당 OCR 이미지 최대 장수(서버도 shared/ocr.ts에서 동일하게 강제).
const MAX_IMAGES = 3;

interface StagedImg {
  dataUrl: string; // 썸네일 미리보기용
  imageBase64: string; // API 전송용(콤마 이후 base64)
  mediaType: string; // 예: image/jpeg
}

function readAsDataURL(file: File): Promise<string> {
  return new Promise((res, rej) => {
    const fr = new FileReader();
    fr.onload = () => res(String(fr.result));
    fr.onerror = () => rej(new Error('파일 읽기 실패'));
    fr.readAsDataURL(file);
  });
}

function splitDataUrl(dataUrl: string): { imageBase64: string; mediaType: string } {
  const comma = dataUrl.indexOf(',');
  const semi = dataUrl.indexOf(';');
  const mediaType = semi > 5 ? dataUrl.slice(5, semi) : 'image/png';
  return { imageBase64: dataUrl.slice(comma + 1), mediaType };
}

// 이미지를 maxDim(px) 이내로 축소해 JPEG dataURL로 반환. 큰 사진 여러 장의 합산 페이로드를 줄인다.
// 이미 충분히 작거나 처리 실패 시 원본 dataURL을 그대로 반환한다.
function downscale(dataUrl: string, maxDim = 2000, quality = 0.9): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
      if (scale >= 1) return resolve(dataUrl);
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      const ctx = canvas.getContext('2d');
      if (!ctx) return resolve(dataUrl);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL('image/jpeg', quality));
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
}

async function fileToImage(file: File): Promise<StagedImg> {
  const dataUrl = await downscale(await readAsDataURL(file));
  return { dataUrl, ...splitDataUrl(dataUrl) };
}

export default function Admin() {
  const [name, setName] = useState('');
  const [choices, setChoices] = useState(5);
  const [perMin, setPerMin] = useState(15);
  const [rows, setRows] = useState<RowsBySection>({});
  const [msg, setMsg] = useState('');
  const [ocrBusy, setOcrBusy] = useState<Partial<Record<Section, boolean>>>({});
  const [ocrMsg, setOcrMsg] = useState<Partial<Record<Section, string>>>({});
  const [ocrImgs, setOcrImgs] = useState<Partial<Record<Section, StagedImg[]>>>({});
  const [bulkText, setBulkText] = useState<Partial<Record<Section, string>>>({});
  const [bulkOpen, setBulkOpen] = useState<Partial<Record<Section, boolean>>>({});
  const { user } = useAuth();
  const requestedOfficial =
    new URLSearchParams(window.location.search).get('type') === 'official' && !!user?.isAdmin;
  const officialMode = requestedOfficial;

  // 영역별 이미지 스테이징 — 최대 MAX_IMAGES장까지 담아두고, '분석'을 눌러 함께 전송한다.
  const addImages = async (sec: Section, files: File[]) => {
    const remaining = MAX_IMAGES - (ocrImgs[sec]?.length ?? 0);
    if (remaining <= 0) return;
    try {
      const imgs = await Promise.all(files.slice(0, remaining).map(fileToImage));
      setOcrImgs((m) => ({ ...m, [sec]: [...(m[sec] ?? []), ...imgs].slice(0, MAX_IMAGES) }));
    } catch (e) {
      setOcrMsg((m) => ({
        ...m,
        [sec]: '이미지 읽기 실패: ' + (e instanceof Error ? e.message : String(e)),
      }));
    }
  };

  const removeImage = (sec: Section, idx: number) =>
    setOcrImgs((m) => ({ ...m, [sec]: (m[sec] ?? []).filter((_, i) => i !== idx) }));

  const runOcr = async (sec: Section) => {
    const imgs = ocrImgs[sec] ?? [];
    if (imgs.length === 0) return;
    setOcrBusy((b) => ({ ...b, [sec]: true }));
    setOcrMsg((m) => ({ ...m, [sec]: '분석 중…' }));
    try {
      const r = await fetch('/api/ocr', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          images: imgs.map(({ imageBase64, mediaType }) => ({ imageBase64, mediaType })),
          section: sec,
        }),
      });
      const rawText = await r.text();
      let data: any = {};
      try {
        data = rawText ? JSON.parse(rawText) : {};
      } catch {
        // 비-JSON 응답(예: 백엔드 미가동 시 빈/HTML 응답)
      }
      if (!r.ok) throw new Error(data?.error || `OCR 요청 실패 (${r.status})`);
      const items = Array.isArray(data.items) ? data.items : [];
      if (items.length === 0) {
        setOcrMsg((m) => ({ ...m, [sec]: '인식된 문항이 없어요. 이미지를 확인하세요.' }));
        return;
      }
      setRows((prev) => {
        const fromOcr = rowsFromItems(items);
        const analyzed = fromOcr[sec] ?? [];
        return {
          ...prev,
          [sec]: resizeRows(analyzed, Math.max(20, analyzed.length)),
        };
      });
      setBulkOpen((prev) => ({ ...prev, [sec]: true }));
      setOcrMsg((m) => ({ ...m, [sec]: `${items.length}문항 인식됨 · 아래 표에서 검수하세요.` }));
    } catch (e) {
      setOcrMsg((m) => ({
        ...m,
        [sec]: '실패: ' + (e instanceof Error ? e.message : String(e)),
      }));
    } finally {
      setOcrBusy((b) => ({ ...b, [sec]: false }));
    }
  };

  const reset = () => {
    setName('');
    setChoices(5);
    setPerMin(15);
    setRows({});
    setOcrImgs({});
    setOcrMsg({});
    setBulkText({});
    setBulkOpen({});
  };

  const addSectionManually = (sec: Section) => {
    setRows((prev) => ({
      ...prev,
      [sec]: prev[sec]?.length ? prev[sec] : makeRows(20),
    }));
    setBulkOpen((prev) => ({ ...prev, [sec]: true }));
  };

  const removeSection = (sec: Section) => {
    setRows((prev) => {
      const next = { ...prev };
      delete next[sec];
      return next;
    });
    setBulkText((prev) => {
      const next = { ...prev };
      delete next[sec];
      return next;
    });
    setBulkOpen((prev) => {
      const next = { ...prev };
      delete next[sec];
      return next;
    });
  };

  const updateSectionCount = (sec: Section, value: string) => {
    const count = clampInt(value, 1, 100, rows[sec]?.length || 20);
    setRows((prev) => ({
      ...prev,
      [sec]: resizeRows(prev[sec] ?? [], count),
    }));
  };

  const applyBulk = (sec: Section) => {
    const text = bulkText[sec]?.trim();
    if (!text) return;
    setRows((prev) => ({
      ...prev,
      [sec]: parseBulk(text, prev[sec] ?? makeRows(20), choices),
    }));
  };

  const save = async () => {
    const items = buildItems(rows);
    if (!name.trim()) return setMsg('이름을 입력하세요.');
    if (items.length === 0) return setMsg('정답이 입력된 문항이 없어요.');
    const ps: ProblemSet = {
      id: crypto.randomUUID(),
      name: name.trim(),
      createdAt: new Date().toISOString(),
      sections: includedSections(rows),
      items,
      config: {
        choices,
        perSectionTimeSec: perMin * 60,
        targetPerQuestionSec: 45,
      },
      owner: user?.nickname,
      official: officialMode,
    };
    try {
      await store.saveProblemSet(ps);
      setMsg(`저장됨 · ${items.length}문항`);
      reset();
    } catch (e) {
      setMsg('저장 실패: ' + (e instanceof Error ? e.message : String(e)));
    }
  };

  return (
    <main className="mx-auto w-[min(1200px,calc(100vw-48px))] pb-24 pt-8">
      <header>
        <Link className="text-sm font-medium text-zinc-500 no-underline hover:text-zinc-800" to="/">
          ← 목록으로
        </Link>
        <h1 className="mt-5 text-3xl font-bold tracking-[-0.03em] text-zinc-900">
          {officialMode ? '공식 문제셋 만들기' : '사설 문제셋 만들기'}
        </h1>
      </header>

      <section className="mt-9">
        <div className="grid grid-cols-[minmax(0,1fr)_140px_140px] gap-3 max-[760px]:grid-cols-1">
          <label className="block">
            <span className="mb-1.5 block text-xs font-medium text-zinc-500">이름</span>
            <input
              className="h-12 w-full rounded-xl border border-zinc-200 bg-white px-4 text-sm outline-none transition placeholder:text-zinc-400 focus:border-zinc-400"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="예: 2026 봄 모의고사 A"
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-xs font-medium text-zinc-500">선택지 수</span>
            <input
              className="h-12 w-full rounded-xl border border-zinc-200 bg-white px-4 text-sm outline-none transition focus:border-zinc-400"
              type="number"
              min={2}
              max={10}
              value={choices}
              onChange={(event) => setChoices(clampInt(event.target.value, 2, 10, 5))}
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-xs font-medium text-zinc-500">영역 시간(분)</span>
            <input
              className="h-12 w-full rounded-xl border border-zinc-200 bg-white px-4 text-sm outline-none transition focus:border-zinc-400"
              type="number"
              min={1}
              max={60}
              value={perMin}
              onChange={(event) => setPerMin(clampInt(event.target.value, 1, 60, 15))}
            />
          </label>
        </div>
      </section>

      <section className="mt-9 rounded-2xl border border-hairline bg-white p-5 shadow-[0_8px_28px_rgba(32,32,32,0.055)]">
        <h2 className="text-lg font-bold text-zinc-900">이미지로 자동 채우기 (OCR)</h2>
        <p className="mt-1 text-xs leading-5 text-zinc-500">
          영역별 정답표 이미지를 최대 {MAX_IMAGES}장까지 올린 뒤 AI로 분석하세요.
        </p>
        <div className="mt-5 grid grid-cols-5 gap-3 max-[960px]:grid-cols-2 max-[560px]:grid-cols-1">
          {SECTIONS.map((sec) => {
            const busy = !!ocrBusy[sec];
            const imgs = ocrImgs[sec] ?? [];
            const count = rows[sec]?.filter((r) => r.answer != null).length ?? 0;
            return (
              <div className="flex min-h-48 flex-col rounded-xl border border-zinc-200 bg-zinc-50/60 p-3" key={sec}>
                <div className="flex items-center justify-between gap-2">
                  <strong className="text-sm text-zinc-900">{sec}</strong>
                  {count > 0 && <span className="rounded-full bg-red-50 px-2 py-0.5 text-[10px] font-semibold text-brand">{count}문항</span>}
                </div>

                <div className="mt-3 flex flex-col gap-3">
                  {imgs.map((im, i) => (
                    <div
                      className="group/thumb relative aspect-square w-full overflow-hidden rounded-lg border border-zinc-200 bg-white"
                      key={i}
                    >
                      <img
                        className="h-full w-full object-cover"
                        src={im.dataUrl}
                        alt={`${sec} 이미지 ${i + 1}`}
                      />
                      <button
                        type="button"
                        className="absolute inset-x-1 bottom-1 rounded-md bg-black/65 py-1 text-[10px] font-semibold text-white opacity-0 transition group-hover/thumb:opacity-100"
                        aria-label="이미지 삭제"
                        disabled={busy}
                        onClick={() => removeImage(sec, i)}
                      >
                        삭제
                      </button>
                    </div>
                  ))}
                  {imgs.length < MAX_IMAGES && (
                    <label
                      className={`grid aspect-square w-full cursor-pointer place-items-center rounded-lg border border-dashed border-zinc-300 bg-white text-xl text-zinc-400 transition hover:border-zinc-500 hover:text-zinc-600 ${
                        busy ? 'pointer-events-none opacity-40' : ''
                      }`}
                      aria-label="이미지 추가"
                    >
                      <span>+</span>
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        hidden
                        disabled={busy}
                        onChange={(e) => {
                          const files = Array.from(e.target.files ?? []);
                          if (files.length) addImages(sec, files);
                          e.target.value = '';
                        }}
                      />
                    </label>
                  )}
                </div>

                <div className="mt-auto flex items-center justify-between gap-2 pt-3">
                  <span className="text-[11px] font-medium text-zinc-400">{imgs.length}/{MAX_IMAGES}장</span>
                  <button
                    type="button"
                    className="rounded-lg bg-brand px-3 py-2 text-[11px] font-semibold text-white transition hover:bg-[#c90026] disabled:cursor-not-allowed disabled:bg-red-200"
                    disabled={busy || imgs.length === 0}
                    onClick={() => runOcr(sec)}
                  >
                    {busy ? '분석 중…' : 'AI로 분석'}
                  </button>
                </div>

                {ocrMsg[sec] && <span className="mt-2 text-[11px] leading-4 text-zinc-500">{ocrMsg[sec]}</span>}
              </div>
            );
          })}
        </div>
      </section>

      <div className="mt-4 flex flex-wrap gap-2">
        {SECTIONS.map((sec) => (
          <button
            key={sec}
            type="button"
            className="rounded-full border border-zinc-200 bg-white px-4 py-2.5 text-sm font-bold text-zinc-800 transition hover:border-zinc-300 hover:bg-zinc-50 disabled:cursor-default disabled:text-zinc-400"
            disabled={!!rows[sec]?.length}
            onClick={() => addSectionManually(sec)}
          >
            + {sec}
          </button>
        ))}
      </div>

      <div className="mt-6 space-y-5">
        {includedSections(rows).map((sec) => {
          const sectionRows = rows[sec] ?? [];
          const isBulkOpen = bulkOpen[sec] !== false;
          return (
            <section
              key={sec}
              className="rounded-2xl border border-hairline bg-white p-5 shadow-[0_8px_28px_rgba(32,32,32,0.055)]"
            >
              <div className="flex flex-wrap items-center gap-4">
                <h2 className="mr-1 text-xl font-bold tracking-[-0.02em] text-zinc-900">{sec}</h2>
                <label className="flex items-center gap-2">
                  <span className="text-sm font-medium text-zinc-500">문항 수</span>
                  <input
                    className="h-11 w-20 rounded-xl border border-zinc-200 bg-white px-3 text-base outline-none transition focus:border-zinc-400"
                    type="number"
                    min={1}
                    max={100}
                    value={sectionRows.length}
                    onChange={(event) => updateSectionCount(sec, event.target.value)}
                  />
                </label>
                <button
                  type="button"
                  className="ml-auto h-11 rounded-xl border border-zinc-200 bg-white px-4 text-sm font-bold text-zinc-800 transition hover:bg-zinc-50"
                  onClick={() => removeSection(sec)}
                >
                  영역 제거
                </button>
              </div>

              <div className="mt-4 rounded-xl border border-dashed border-zinc-300 p-4">
                <button
                  type="button"
                  className="flex items-center gap-1.5 text-left text-sm font-bold text-zinc-900"
                  onClick={() => setBulkOpen((prev) => ({ ...prev, [sec]: !isBulkOpen }))}
                >
                  <span>{isBulkOpen ? '▼' : '▶'}</span>
                  빠른 입력 (붙여넣기)
                </button>
                {isBulkOpen && (
                  <div className="mt-3">
                    <p className="text-xs leading-5 text-zinc-500">
                      한 줄에 번호·정답·정답률(예: 1 3 82), 또는 정답·정답률, 정답만 입력할 수 있습니다.
                      공백과 쉼표로 구분하세요.
                    </p>
                    <textarea
                      className="mt-3 min-h-32 w-full resize-y rounded-xl border border-zinc-200 bg-white p-4 text-sm leading-6 outline-none transition placeholder:text-zinc-400 focus:border-zinc-400"
                      value={bulkText[sec] ?? ''}
                      onChange={(event) =>
                        setBulkText((prev) => ({ ...prev, [sec]: event.target.value }))
                      }
                      placeholder={'1 3 82\n2 5 64\n3 1 45'}
                    />
                    <button
                      type="button"
                      className="ml-auto mt-3 block rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-sm font-bold text-zinc-800 transition hover:bg-zinc-50"
                      onClick={() => applyBulk(sec)}
                    >
                      적용
                    </button>
                  </div>
                )}
              </div>

              <div className="mt-4 grid grid-cols-4 gap-x-6 gap-y-3 rounded-xl border border-zinc-200 p-4 max-[960px]:grid-cols-2 max-[560px]:grid-cols-1">
                {sectionRows.map((row, index) => (
                  <div className="grid grid-cols-[24px_minmax(0,1fr)_minmax(0,1fr)] items-center gap-2" key={row.number}>
                    <span className="text-right text-sm font-medium text-zinc-500">{row.number}</span>
                    <select
                      aria-label={`${sec} ${row.number}번 정답`}
                      className="h-10 min-w-0 appearance-none rounded-lg border border-zinc-200 bg-white py-0 pl-2 pr-8 text-sm outline-none transition focus:border-zinc-400"
                      style={{
                        backgroundImage:
                          'url("data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 width=%2712%27 height=%277%27 viewBox=%270 0 12 7%27 fill=%27none%27%3E%3Cpath d=%27M1 1l5 5 5-5%27 stroke=%27%2352525b%27 stroke-width=%271.5%27 stroke-linecap=%27round%27 stroke-linejoin=%27round%27/%3E%3C/svg%3E")',
                        backgroundPosition: 'right 14px center',
                        backgroundRepeat: 'no-repeat',
                      }}
                      value={row.answer ?? ''}
                      onChange={(event) => {
                        const answer = event.target.value ? Number(event.target.value) : null;
                        setRows((prev) => {
                          const next = [...(prev[sec] ?? [])];
                          next[index] = { ...next[index], answer };
                          return { ...prev, [sec]: next };
                        });
                      }}
                    >
                      <option value="">정답</option>
                      {Array.from({ length: choices }, (_, choiceIndex) => (
                        <option value={choiceIndex + 1} key={choiceIndex + 1}>
                          {choiceIndex + 1}
                        </option>
                      ))}
                    </select>
                    <input
                      aria-label={`${sec} ${row.number}번 정답률`}
                      className="h-10 min-w-0 rounded-lg border border-zinc-200 bg-white px-2 text-sm outline-none transition placeholder:text-zinc-400 focus:border-zinc-400"
                      type="number"
                      min={0}
                      max={100}
                      placeholder="정답률"
                      value={row.correctRate ?? ''}
                      onChange={(event) => {
                        const rate =
                          event.target.value === ''
                            ? null
                            : clampInt(event.target.value, 0, 100, 50);
                        setRows((prev) => {
                          const next = [...(prev[sec] ?? [])];
                          next[index] = { ...next[index], correctRate: rate };
                          return { ...prev, [sec]: next };
                        });
                      }}
                    />
                  </div>
                ))}
              </div>
            </section>
          );
        })}
      </div>

      <div className="mt-6 flex items-center justify-end gap-4">
        {msg && <span className="text-sm font-medium text-zinc-500">{msg}</span>}
        <button
          className="rounded-[10px] bg-brand px-6 py-3 text-sm font-bold text-white transition hover:-translate-y-px hover:bg-[#c90026]"
          onClick={save}
          type="button"
        >
          문제셋 저장
        </button>
      </div>
    </main>
  );
}

function clampInt(v: string, min: number, max: number, fallback: number): number {
  const n = parseInt(v, 10);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(min, Math.min(max, n));
}
