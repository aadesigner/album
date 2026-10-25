import { Link } from 'wouter';
import { mixHex, offerBarBackground } from '@/lib/offerBar';

export function OfferBarStrip({
  text,
  button,
  href,
  bg,
  textColor,
  buttonBg,
  buttonText,
  langTag,
}: {
  text: string;
  button?: string;
  href?: string;
  bg: string;
  textColor: string;
  buttonBg: string;
  buttonText: string;
  langTag?: string;
}) {
  const btn = button ? (
    <span
      className="inline-flex items-center px-3.5 py-[5px] rounded-full text-[10px] sm:text-[10.5px] font-semibold uppercase tracking-[0.16em] transition-transform hover:-translate-y-px active:translate-y-0"
      style={{
        background: buttonBg,
        color: buttonText,
        boxShadow: `inset 0 1px 0 ${mixHex(buttonBg, '#FFFFFF', 0.55)}, 0 1px 2px rgba(0,0,0,0.12)`,
      }}
    >
      {button}
    </span>
  ) : null;

  return (
    <div
      style={{
        background: offerBarBackground(bg),
        color: textColor,
        boxShadow: `inset 0 1px 0 ${mixHex(textColor, '#FFFFFF', 0.35)}40, 0 1px 0 rgba(0,0,0,0.12)`,
      }}
    >
      <div className="max-w-7xl mx-auto px-4 py-2 sm:py-[9px] flex items-center justify-center gap-2.5 sm:gap-3.5 flex-wrap text-center">
        {langTag && (
          <span className="text-[9.5px] font-semibold tracking-[0.16em] uppercase opacity-50">
            {langTag}
          </span>
        )}
        <span aria-hidden className="text-[9px] tracking-[0.28em] opacity-60">
          ✦
        </span>
        <span className="text-[12px] sm:text-[13px] font-medium tracking-[0.015em] leading-snug">
          {text}
        </span>
        {button && (href ? <Link href={href}>{btn}</Link> : btn)}
      </div>
    </div>
  );
}
