/* تسلسل آمن لبيانات JSON-LD قبل وضعها داخل وسم <script> عبر dangerouslySetInnerHTML.
   JSON.stringify وحده لا يهرّب «<» و«>» و«&»، فمحتوى إداري يحوي «</script>» أو وسومًا
   يستطيع كسر السكربت وحقن HTML. تهريب هذه المحارف الثلاثة يغلق منفذ الكسر تمامًا لأن
   الخروج من الوسم لا يحدث إلا عبر «<». */
export function jsonLdHtml(data: unknown): string {
  return JSON.stringify(data)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026");
}
