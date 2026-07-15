"use client";

export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <section className="not-found">
      <span className="num">خطأ مؤقت</span>
      <h1>حدث خلل غير متوقع</h1>
      <p>لم يكتمل تحميل هذه الصفحة. سلتك وبياناتك المحفوظة لم تتأثر.</p>
      <button className="btn btn-crimson" onClick={() => reset()}>
        إعادة المحاولة
      </button>
    </section>
  );
}
