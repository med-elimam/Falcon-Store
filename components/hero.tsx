"use client";

import Image from "next/image";
import Link from "next/link";
import { motion, useMotionValue, useReducedMotion, useTransform } from "framer-motion";
import type { MouseEvent } from "react";
import { ArrowLeft, FalconMark } from "./icons";

export function Hero() {
  const reduced = useReducedMotion();
  const px = useMotionValue(0);
  const py = useMotionValue(0);
  const x = useTransform(px, [-0.5, 0.5], [10, -10]);
  const y = useTransform(py, [-0.5, 0.5], [6, -6]);
  const onMove = (event: MouseEvent<HTMLElement>) => {
    if (reduced) return;
    const rect = event.currentTarget.getBoundingClientRect();
    px.set((event.clientX - rect.left) / rect.width - 0.5);
    py.set((event.clientY - rect.top) / rect.height - 0.5);
  };

  return (
    <section className="hero" onMouseMove={onMove}>
      <motion.div className="hero-media" style={reduced ? undefined : { x, y }}>
        <Image src="/images/hero-wide.jpg" alt="مجموعة مختارة من عطور فالكون ستور أمام واجهة المتجر" fill priority sizes="100vw" />
      </motion.div>
      <div className="hero-shade" />
      <div className="shell hero-content">
        <motion.div className="hero-copy" initial={false} animate={reduced ? undefined : { y: [12, 0] }} transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}>
          <div className="hero-signature"><FalconMark /><span>THE SCENT VAULT · NOUAKCHOTT</span></div>
          <h1>عطور أصلية.<br /><em>حضور لا يُنسى.</em></h1>
          <p>اختيارات نيش ومصممين موثوقة، مع تعبئة دقيقة بحجم 10ml من الزجاجة الأصلية.</p>
          <div className="hero-actions"><Link href="/shop" className="btn btn-crimson">تسوّق الآن <ArrowLeft /></Link><Link href="#decants" className="btn btn-ghost">اكتشف عطور 10ml</Link></div>
        </motion.div>
      </div>
      <div className="hero-index num"><span>01</span><i /><span>FLC</span></div>
    </section>
  );
}
