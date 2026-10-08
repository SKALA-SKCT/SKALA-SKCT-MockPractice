import { useEffect, useState } from 'react';

// AI 튜터는 별도 서비스(ai-tutor.skala-skct.com)의 /embed 화면을 넣는다. 같은 사이트라 로그인 쿠키가 그대로 쓰인다.
const AI_TUTOR_URL = import.meta.env.VITE_AI_TUTOR_URL ?? 'https://ai-tutor.skala-skct.com';

/**
 * 결과 페이지가 길어 스크롤이 늘지 않도록, 떠 있는 버튼으로 여는 옆 패널(모바일은 아래 시트)이다.
 * 처음 열 때 iframe을 만들고 닫을 때는 숨기기만 해서 올린 캡처와 답변을 보존한다.
 */
export default function AiTutorDrawer({
  open,
  label,
  onOpen,
  onClose,
}: {
  open: boolean;
  /** 문항 줄에서 열었을 때 안내할 문항(예: 언어추리 7번) */
  label: string | null;
  onOpen: () => void;
  onClose: () => void;
}) {
  const [opened, setOpened] = useState(open);
  if (open && !opened) setOpened(true);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  return (
    <>
      {!open && (
        <button
          type="button"
          onClick={onOpen}
          className="fixed bottom-6 right-6 z-40 rounded-full bg-brand px-5 py-3 text-sm font-bold text-white shadow-lg transition hover:brightness-95"
        >
          AI 튜터
        </button>
      )}
      {opened && (
        <aside
          role="dialog"
          aria-modal="false"
          aria-label="AI 튜터"
          className={`fixed inset-x-0 bottom-0 z-50 flex h-[85vh] flex-col rounded-t-2xl border-t border-hairline bg-white shadow-2xl md:inset-x-auto md:top-[68px] md:right-0 md:h-auto md:w-[420px] md:rounded-none md:border-l md:border-t-0 ${open ? '' : 'hidden'}`}
        >
          <div className="flex items-center justify-between gap-3 border-b border-hairline px-4 py-3">
            <div className="min-w-0">
              <p className="text-sm font-bold text-ink">AI 튜터</p>
              <p className="truncate text-xs text-ink-2">
                {label ? `${label} 문제를 캡처해 올려 주세요` : '막힌 문제를 캡처해 올리면 교재 근거로 접근법을 알려 드려요'}
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="shrink-0 rounded-lg px-3 py-1.5 text-sm font-semibold text-ink-2 transition hover:bg-zinc-100"
            >
              닫기
            </button>
          </div>
          <iframe src={`${AI_TUTOR_URL}/embed`} title="AI 튜터" className="min-h-0 w-full flex-1 border-0" />
        </aside>
      )}
    </>
  );
}
