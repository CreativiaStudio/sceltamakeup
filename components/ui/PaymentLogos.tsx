import React from "react";

// ============================================================================
// OFFICIAL PAYMENT BRAND SVG LOGOS & PILLS
// Scelta Makeup — Luxury Boutique Styling
// ============================================================================

export function VisaLogo({ className = "h-5" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 48 32"
      className={className}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="Visa"
    >
      <rect width="48" height="32" rx="4" fill="#FFFFFF" stroke="#E2E8F0" />
      <path
        d="M20.2 21H17.4L19.1 11H21.9L20.2 21ZM15.3 11L12.6 17.8L12.3 16.3C11.8 14.6 10.3 12.8 8.6 11.9L11.1 21H14L18.3 11H15.3ZM30.4 17.8C30.4 15 26.5 14.8 26.5 13.5C26.5 13 27 12.5 28.1 12.3C28.6 12.2 30.1 12.1 31.6 12.8L32.2 11.2C31.4 10.9 30.2 10.6 28.7 10.6C25.4 10.6 23.1 12.3 23.1 14.8C23.1 18.2 27.9 18.1 27.9 20C27.9 20.6 27.1 21.1 25.9 21.1C24.3 21.1 22.8 20.4 22 20L21.4 21.7C22.3 22.2 24.1 22.6 25.8 22.6C29.4 22.6 31.7 20.8 31.7 18.2L30.4 17.8ZM39.6 21H42.1L39.8 11H37.5C36.7 11 36.1 11.4 35.8 12.1L31.5 21H34.4L35 19.3H38.5L39.6 21ZM35.8 17.2L37.2 13.3L38 17.2H35.8Z"
        fill="#1434CB"
      />
    </svg>
  );
}

export function MastercardLogo({ className = "h-5" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 48 32"
      className={className}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="Mastercard"
    >
      <rect width="48" height="32" rx="4" fill="#FFFFFF" stroke="#E2E8F0" />
      <circle cx="19" cy="16" r="8" fill="#EB001B" />
      <circle cx="29" cy="16" r="8" fill="#F79E1B" fillOpacity="0.9" />
      <path
        d="M24 10.7C25.7 12 26.8 13.9 26.8 16C26.8 18.1 25.7 20 24 21.3C22.3 20 21.2 18.1 21.2 16C21.2 13.9 22.3 12 24 10.7Z"
        fill="#FF5F00"
      />
    </svg>
  );
}

export function AmexLogo({ className = "h-5" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 48 32"
      className={className}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="American Express"
    >
      <rect width="48" height="32" rx="4" fill="#006FCF" />
      <path
        d="M9 13.5H12.5L14.2 17.5L16 13.5H19.5L16.2 19.5H12.2L9 13.5ZM13 18.2H15.5L14.2 15.5L13 18.2ZM21 13.5H23.5L25.8 17L28 13.5H30.5V19.5H28.5V16L26.5 19H25L23 16V19.5H21V13.5ZM32 13.5H38.5V15H34V15.8H38V17.2H34V18H38.5V19.5H32V13.5ZM40 13.5L42.5 16.5L45 13.5H47.5L44 17L47.5 19.5H45L42.5 17.5L40 19.5H37.5L41 17L37.5 13.5H40Z"
        fill="#FFFFFF"
      />
    </svg>
  );
}

export function PostePayLogo({ className = "h-5" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 48 32"
      className={className}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="PostePay"
    >
      <rect width="48" height="32" rx="4" fill="#FFCC00" />
      <text
        x="6"
        y="17"
        fill="#003399"
        fontFamily="sans-serif"
        fontWeight="800"
        fontSize="9"
      >
        poste
      </text>
      <text
        x="26"
        y="23"
        fill="#003399"
        fontFamily="sans-serif"
        fontWeight="900"
        fontStyle="italic"
        fontSize="10"
      >
        pay
      </text>
    </svg>
  );
}

export function ApplePayLogo({ className = "h-5" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 48 32"
      className={className}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="Apple Pay"
    >
      <rect width="48" height="32" rx="4" fill="#000000" />
      <path
        d="M17.8 15.6C17.8 14.3 18.5 13.3 19.2 12.8C18.6 12 17.5 11.5 16.4 11.5C15 11.5 14.1 12.3 13.4 12.3C12.6 12.3 11.7 11.6 10.6 11.6C9.1 11.6 7.6 12.5 6.8 14C5.1 16.9 6.4 21.2 8 23.5C8.8 24.6 9.7 25.8 10.9 25.8C12 25.8 12.4 25.1 13.8 25.1C15.1 25.1 15.5 25.8 16.7 25.8C17.9 25.8 18.7 24.7 19.5 23.6C20.4 22.3 20.8 21 20.8 20.9C20.7 20.8 17.8 19.7 17.8 15.6ZM15.4 9.9C16.1 9 16.6 7.8 16.4 6.5C15.4 6.6 14.1 7.2 13.4 8.1C12.8 8.8 12.3 10.1 12.5 11.3C13.6 11.4 14.8 10.8 15.4 9.9Z"
        fill="#FFFFFF"
      />
      <text
        x="23"
        y="21"
        fill="#FFFFFF"
        fontFamily="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
        fontWeight="600"
        fontSize="12"
      >
        Pay
      </text>
    </svg>
  );
}

export function GooglePayLogo({ className = "h-5" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 48 32"
      className={className}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="Google Pay"
    >
      <rect width="48" height="32" rx="4" fill="#FFFFFF" stroke="#E2E8F0" />
      {/* Google 'G' */}
      <path
        d="M17.5 16.1C17.5 15.6 17.4 15.1 17.3 14.6H12V16.8H15.1C14.9 17.6 14.4 18.3 13.7 18.8V20.4H15.9C17.2 19.2 17.5 17.4 17.5 16.1Z"
        fill="#4285F4"
      />
      <path
        d="M12 21.7C13.6 21.7 14.9 21.2 15.9 20.4L13.7 18.8C13.2 19.1 12.6 19.3 12 19.3C10.4 19.3 9.1 18.2 8.6 16.7H6.3V18.4C7.4 20.4 9.5 21.7 12 21.7Z"
        fill="#34A853"
      />
      <path
        d="M8.6 16.7C8.4 16.2 8.3 15.6 8.3 15C8.3 14.4 8.4 13.8 8.6 13.3V11.6H6.3C5.8 12.6 5.5 13.8 5.5 15C5.5 16.2 5.8 17.4 6.3 18.4L8.6 16.7Z"
        fill="#FBBC05"
      />
      <path
        d="M12 10.7C12.9 10.7 13.7 11 14.3 11.6L16 9.9C14.9 8.9 13.6 8.3 12 8.3C9.5 8.3 7.4 9.6 6.3 11.6L8.6 13.3C9.1 11.8 10.4 10.7 12 10.7Z"
        fill="#EA4335"
      />
      <text
        x="19.5"
        y="20.5"
        fill="#5F6368"
        fontFamily="sans-serif"
        fontWeight="600"
        fontSize="12"
      >
        Pay
      </text>
    </svg>
  );
}

export function KlarnaLogo({ className = "h-5" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 48 32"
      className={className}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="Klarna"
    >
      <rect width="48" height="32" rx="4" fill="#FFB3C7" />
      <text
        x="6"
        y="21"
        fill="#0A0A0A"
        fontFamily="'Klarna Text', -apple-system, BlinkMacSystemFont, sans-serif"
        fontWeight="900"
        fontSize="12.5"
        letterSpacing="-0.5"
      >
        Klarna.
      </text>
    </svg>
  );
}

export function PayPalLogo({ className = "h-5" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 48 32"
      className={className}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="PayPal"
    >
      <rect width="48" height="32" rx="4" fill="#FFFFFF" stroke="#E2E8F0" />
      {/* Dual P icon */}
      <path
        d="M13 23L15.3 8.5H19.8C22.6 8.5 24.3 9.8 23.9 12.3C23.5 14.5 21.8 15.8 19.4 15.8H16.8L15.6 23H13Z"
        fill="#003087"
      />
      <path
        d="M16 25L17.8 13.5H21.5C23.9 13.5 25.3 14.6 25 16.7C24.6 18.6 23.2 19.7 21.2 19.7H19L18 25H16Z"
        fill="#0079C1"
      />
      <text
        x="24.5"
        y="21"
        fill="#003087"
        fontFamily="sans-serif"
        fontWeight="800"
        fontSize="9.5"
        fontStyle="italic"
      >
        Pal
      </text>
    </svg>
  );
}

export function ScalapayLogo({ className = "h-5" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 48 32"
      className={className}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="Scalapay"
    >
      <rect width="48" height="32" rx="4" fill="#FCE9EE" stroke="#F7CAD8" />
      {/* Scalapay signature playful heart + text */}
      <path
        d="M9 16C9 13.8 10.8 12 13 12C14.2 12 15.3 12.5 16 13.4C16.7 12.5 17.8 12 19 12C21.2 12 23 13.8 23 16C23 18.8 18.5 22 16 23.5C13.5 22 9 18.8 9 16Z"
        fill="#FF6489"
      />
      <text
        x="23"
        y="20.5"
        fill="#1F1B24"
        fontFamily="sans-serif"
        fontWeight="800"
        fontSize="9"
        letterSpacing="-0.3"
      >
        scalapay
      </text>
    </svg>
  );
}

export function StripeSecuredBadge({ className = "h-6" }: { className?: string }) {
  return (
    <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-purple-50/80 border border-[#D8C2E7]/60 text-[11px] text-[#5E1788] font-medium ${className}`}>
      <svg className="w-3.5 h-3.5 text-[#5E1788]" fill="currentColor" viewBox="0 0 24 24">
        <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm-2 16l-4-4 1.41-1.41L10 14.17l6.59-6.59L18 9l-8 8z" />
      </svg>
      <span>Stripe 256-bit SSL</span>
    </div>
  );
}
