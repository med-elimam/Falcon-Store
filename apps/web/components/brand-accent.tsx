"use client";

import { useEffect } from "react";
import { applyAccent } from "@/lib/accent";
import { usePublicSettings } from "./settings-context";

/* يُبقي لون العلامة متزامنًا حيًّا: بعد أن يحفظ الأدمن لونًا جديدًا وتتحدّث
   الإعدادات، يُطبَّق فورًا على كامل الموقع دون إعادة تحميل كامل. اللون الأولي
   يأتي من الأنماط السطرية في التخطيط (SSR) فلا يحدث أي وميض. */
export function BrandAccent() {
  const settings = usePublicSettings();
  const accent = settings?.appearance?.accent;

  useEffect(() => {
    if (accent) applyAccent(document.documentElement, accent);
  }, [accent]);

  return null;
}
