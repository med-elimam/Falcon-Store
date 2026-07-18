-- توسيع أنواع أقسام المحتوى المسموحة لتشمل الأسئلة الشائعة وآراء العملاء.
-- عملية غير مدمّرة: توسّع مجموعة القيم المسموحة فقط ولا تمس أي بيانات.
ALTER TABLE "content_sections" DROP CONSTRAINT IF EXISTS "content_sections_type_chk";--> statement-breakpoint
ALTER TABLE "content_sections" ADD CONSTRAINT "content_sections_type_chk" CHECK ("type" in ('hero','section','offer','banner','faq','testimonial'));
