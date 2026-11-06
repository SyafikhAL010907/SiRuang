import dynamic from 'next/dynamic';
import { DenahGedungSkeleton } from '@/components/Skeletons';

const MainLantai1 = dynamic(
  () => import('@/components/DenahVisual/DenahGedungLE/Lantai1/MainLantai1'),
  {
    loading: () => <DenahGedungSkeleton />,
  }
);

export default function Lantai1Page() {
  return <MainLantai1 />;
}
