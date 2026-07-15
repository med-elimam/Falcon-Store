"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import { LoginForm } from "./login-form";

/**
 * نافذة دخول الإدارة داخل الموقع نفسه عبر <dialog> أصلي:
 * حبس التركيز وEscape مدمجان في المتصفح، وخلفية معتمة تمنع التفاعل الخلفي.
 */
export function LoginModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter();
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog ref={ref} className="login-dialog" onClose={onClose} aria-label="دخول الإدارة">
      {open && (
        <LoginForm
          onSuccess={() => {
            onClose();
            router.push("/manage");
          }}
          onCancel={onClose}
        />
      )}
    </dialog>
  );
}
