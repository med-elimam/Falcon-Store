import Link from "next/link";
import { FalconMark } from "@/components/icons";

export default function NotFound() { return <section className="not-found"><FalconMark /><span className="num">404</span><h1>هذا العطر خارج الخزنة</h1><p>قد يكون الرابط غير صحيح أو المنتج لم يعد معروضاً.</p><Link href="/shop" className="btn btn-crimson">العودة إلى العطور</Link></section>; }
