import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { store } from '../store';
import { useAuth } from '../auth';
import { SECTIONS, type ProblemSet, type Section } from '../types';
import {
  buildItems,
  countFilled,
  includedSections,
  makeRows,
  parseBulk,
  resizeRows,
  rowsFromItems,
  type EditorRow,
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
  const [targetSec, setTargetSec] = useState(45);
  const [rows, setRows] = useState<RowsBySection>({});
  const [editingId, setEditingId] = useState<string | null>(null);
  const [msg, setMsg] = useState('');
  const [sets, setSets] = useState<ProblemSet[]>([]);
  const [ocrBusy, setOcrBusy] = useState<Partial<Record<Section, boolean>>>({});
  const [ocrMsg, setOcrMsg] = useState<Partial<Record<Section, string>>>({});
  const [ocrImgs, setOcrImgs] = useState<Partial<Record<Section, StagedImg[]>>>({});
  const { user } = useAuth();
  const canManage = (s: ProblemSet) => !s.owner || s.owner === user?.nickname;

  const refresh = () => store.listProblemSets().then(setSets).catch(() => setSets([]));
  useEffect(() => {
    refresh();
  }, []);

  const filled = countFilled(rows);

  const toggleSection = (sec: Section) => {
    setRows((r) => {
      const next = { ...r };
      if (next[sec]) delete next[sec];
      else next[sec] = makeRows(20);
      return next;
    });
  };
  const setCount = (sec: Section, n: number) =>
    setRows((r) => ({ ...r, [sec]: resizeRows(r[sec] ?? [], Math.max(1, n)) }));
  const updateRow = (sec: Section, idx: number, patch: Partial<EditorRow>) =>
    setRows((r) => ({
      ...r,
      [sec]: (r[sec] ?? []).map((row, i) => (i === idx ? { ...row, ...patch } : row)),
    }));
  const applyBulk = (sec: Section, text: string) =>
    setRows((r) => ({ ...r, [sec]: parseBulk(text, r[sec] ?? [], choices) }));

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
        return { ...prev, [sec]: fromOcr[sec] ?? prev[sec] };
      });
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
    setTargetSec(45);
    setRows({});
    setEditingId(null);
    setOcrImgs({});
    setOcrMsg({});
  };

  const save = async () => {
    const items = buildItems(rows);
    if (!name.trim()) return setMsg('이름을 입력하세요.');
    if (items.length === 0) return setMsg('정답이 입력된 문항이 없어요.');
    const ps: ProblemSet = {
      id: editingId ?? crypto.randomUUID(),
      name: name.trim(),
      createdAt: new Date().toISOString(),
      sections: includedSections(rows),
      items,
      config: {
        choices,
        perSectionTimeSec: perMin * 60,
        targetPerQuestionSec: targetSec,
      },
      owner: user?.nickname,
      official: !!user?.isAdmin, // 서버가 최종 결정(프로덕션)
    };
    try {
      await store.saveProblemSet(ps);
      setMsg(`저장됨 · ${items.length}문항`);
      reset();
      refresh();
    } catch (e) {
      setMsg('저장 실패: ' + (e instanceof Error ? e.message : String(e)));
    }
  };

  const editSet = (ps: ProblemSet) => {
    setEditingId(ps.id);
    setName(ps.name);
    setChoices(ps.config.choices);
    setPerMin(Math.round(ps.config.perSectionTimeSec / 60));
    setTargetSec(ps.config.targetPerQuestionSec);
    setRows(rowsFromItems(ps.items));
    setMsg('편집 중…');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const del = async (id: string) => {
    try {
      await store.deleteProblemSet(id);
      if (editingId === id) reset();
      refresh();
    } catch (e) {
      setMsg('삭제 실패: ' + (e instanceof Error ? e.message : String(e)));
    }
  };

  return (
    <div className="page admin">
      <Link to="/" className="back">
        ← 홈
      </Link>
      <h1>{editingId ? '문제셋 편집' : '문제셋 만들기'}</h1>
      <p className="muted">
        정답표(정답 + 정답률)를 입력하세요. 정답률이 결과의 오답 패턴 분석 기준이 됩니다. 정답률을
        비워두면 50%로 처리돼요.
      </p>

      <section className="card ocr-card">
        <h2>① 이미지로 자동 채우기 (OCR) · 영역별</h2>
        <p className="muted card-desc">
          각 영역의 정답표 이미지를 <b>영역당 최대 {MAX_IMAGES}장</b>까지 올리고 <b>AI로 분석</b>을
          누르면, 여러 장을 함께 인식해 그 영역만 채웁니다(정답·정답률). 영역을 알려주므로 더 정확해요.
          인식 후 반드시 검수하세요.
        </p>
        <div className="ocr-grid">
          {SECTIONS.map((sec) => {
            const busy = !!ocrBusy[sec];
            const imgs = ocrImgs[sec] ?? [];
            const count = rows[sec]?.filter((r) => r.answer != null).length ?? 0;
            return (
              <div className="ocr-slot" key={sec}>
                <div className="ocr-slot-head">
                  <span className="ocr-slot-name">{sec}</span>
                  {count > 0 && <span className="ocr-slot-count">{count}문항</span>}
                </div>

                <div className="ocr-thumbs">
                  {imgs.map((im, i) => (
                    <div className="ocr-thumb" key={i}>
                      <img src={im.dataUrl} alt={`${sec} 이미지 ${i + 1}`} />
                      <button
                        type="button"
                        className="ocr-thumb-x"
                        aria-label="이미지 삭제"
                        disabled={busy}
                        onClick={() => removeImage(sec, i)}
                      >
                        삭제
                      </button>
                    </div>
                  ))}
                  {imgs.length < MAX_IMAGES && (
                    <label className={`ocr-add${busy ? ' disabled' : ''}`} aria-label="이미지 추가">
                      +
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

                <div className="ocr-slot-foot">
                  <span className="ocr-slot-badge">
                    {imgs.length}/{MAX_IMAGES}장
                  </span>
                  <button
                    type="button"
                    className="btn sm primary"
                    disabled={busy || imgs.length === 0}
                    onClick={() => runOcr(sec)}
                  >
                    {busy ? '분석 중…' : 'AI로 분석'}
                  </button>
                </div>

                {ocrMsg[sec] && <span className="ocr-slot-msg">{ocrMsg[sec]}</span>}
              </div>
            );
          })}
        </div>
      </section>

      <section className="card">
        <div className="field-row">
          <label className="field">
            <span>이름</span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="예: 2026 봄 모의고사 A"
            />
          </label>
          <label className="field sm">
            <span>선택지 수</span>
            <input
              type="number"
              min={2}
              max={10}
              value={choices}
              onChange={(e) => setChoices(clampInt(e.target.value, 2, 10, 5))}
            />
          </label>
          <label className="field sm">
            <span>영역 시간(분)</span>
            <input
              type="number"
              min={1}
              max={60}
              value={perMin}
              onChange={(e) => setPerMin(clampInt(e.target.value, 1, 60, 15))}
            />
          </label>
          <label className="field sm">
            <span>목표(초/문항)</span>
            <input
              type="number"
              min={10}
              max={300}
              value={targetSec}
              onChange={(e) => setTargetSec(clampInt(e.target.value, 10, 300, 45))}
            />
          </label>
        </div>

        <div className="section-chips">
          {SECTIONS.map((sec) => (
            <button
              key={sec}
              className={`chip${rows[sec] ? ' on' : ''}`}
              onClick={() => toggleSection(sec)}
              type="button"
            >
              {rows[sec] ? '선택됨 ' : '추가 '}
              {sec}
            </button>
          ))}
        </div>
      </section>

      {SECTIONS.filter((s) => rows[s]).map((sec) => (
        <SectionEditor
          key={sec}
          sec={sec}
          rows={rows[sec]!}
          choices={choices}
          onCount={(n) => setCount(sec, n)}
          onBulk={(t) => applyBulk(sec, t)}
          onUpdate={(i, patch) => updateRow(sec, i, patch)}
          onRemove={() => toggleSection(sec)}
        />
      ))}

      <div className="save-bar">
        <span className="muted">정답 입력됨 {filled}문항</span>
        {msg && <span className="save-msg">{msg}</span>}
        <div className="spacer" />
        {editingId && (
          <button className="btn ghost" onClick={reset} type="button">
            새로 만들기
          </button>
        )}
        <button className="btn primary" onClick={save} type="button">
          {editingId ? '변경 저장' : '문제셋 저장'}
        </button>
      </div>

      <section className="card">
        <h2>저장된 문제셋</h2>
        {sets.length === 0 ? (
          <p className="muted">아직 없어요.</p>
        ) : (
          <ul className="set-list">
            {sets.map((s) => (
              <li key={s.id}>
                <div className="set-meta">
                  <strong>
                    {s.official && <span className="badge-official">공식</span>}
                    {s.name}
                  </strong>
                  <span className="muted">
                    {s.items.length}문항 · {s.sections.join(', ')}
                    {s.owner ? ` · ${s.owner}` : ''}
                  </span>
                </div>
                {canManage(s) ? (
                  <div className="row-actions">
                    <button className="btn sm" onClick={() => editSet(s)} type="button">
                      편집
                    </button>
                    <button className="btn ghost sm" onClick={() => del(s.id)} type="button">
                      삭제
                    </button>
                  </div>
                ) : (
                  <span className="muted own-note">다른 사용자</span>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function SectionEditor({
  sec,
  rows,
  choices,
  onCount,
  onBulk,
  onUpdate,
  onRemove,
}: {
  sec: Section;
  rows: EditorRow[];
  choices: number;
  onCount: (n: number) => void;
  onBulk: (text: string) => void;
  onUpdate: (idx: number, patch: Partial<EditorRow>) => void;
  onRemove: () => void;
}) {
  const [bulk, setBulk] = useState('');
  return (
    <section className="card section-editor">
      <div className="section-editor-head">
        <h2>{sec}</h2>
        <label className="field xs">
          <span>문항 수</span>
          <input
            type="number"
            min={1}
            max={50}
            value={rows.length}
            onChange={(e) => onCount(clampInt(e.target.value, 1, 50, 20))}
          />
        </label>
        <div className="spacer" />
        <button className="btn ghost sm" onClick={onRemove} type="button">
          영역 제거
        </button>
      </div>

      <details className="bulk">
        <summary>빠른 입력 (붙여넣기)</summary>
        <p className="muted">
          한 줄에 <code>번호 정답 정답률</code> (예: <code>1 3 82</code>), 또는{' '}
          <code>정답 정답률</code>, <code>정답</code>만도 가능. 공백/쉼표 구분.
        </p>
        <textarea
          value={bulk}
          onChange={(e) => setBulk(e.target.value)}
          placeholder={'1 3 82\n2 5 64\n3 1 45'}
          rows={4}
        />
        <button
          className="btn sm"
          onClick={() => {
            onBulk(bulk);
            setBulk('');
          }}
          type="button"
        >
          적용
        </button>
      </details>

      <div className="rows-grid-wrap">
        <div className="rows-grid">
          {rows.map((r, i) => (
            <div className="ak-row" key={i}>
              <span className="ak-num">{r.number}</span>
              <select
                value={r.answer ?? ''}
                onChange={(e) =>
                  onUpdate(i, { answer: e.target.value ? Number(e.target.value) : null })
                }
              >
                <option value="">정답</option>
                {Array.from({ length: choices }, (_, k) => k + 1).map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
              <input
                className="ak-rate"
                type="number"
                min={0}
                max={100}
                value={r.correctRate ?? ''}
                onChange={(e) =>
                  onUpdate(i, {
                    correctRate: e.target.value === '' ? null : clampInt(e.target.value, 0, 100, 0),
                  })
                }
                placeholder="정답률"
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function clampInt(v: string, min: number, max: number, fallback: number): number {
  const n = parseInt(v, 10);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(min, Math.min(max, n));
}
