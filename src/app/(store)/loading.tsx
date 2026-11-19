import { ProductGridSkeleton } from '@/components/store/ProductCard';
export default function Loading() {
  return <div className="container-x py-10"><div className="skeleton mb-6 h-10 w-64" /><ProductGridSkeleton /></div>;
}
