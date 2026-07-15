export default function RootLoading() {
  return (
    <div className="route-loading" role="status" aria-label="جارٍ التحميل">
      <span className="route-loading-mark">F</span>
      <p>جارٍ فتح الخزنة…</p>
    </div>
  );
}
