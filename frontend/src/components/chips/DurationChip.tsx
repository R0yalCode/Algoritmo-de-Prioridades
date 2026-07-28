import { Timer } from 'lucide-react';
import GlassChip from './GlassChip';

interface Props {
  value: number;
}

export default function DurationChip({ value }: Props) {
  return <GlassChip icon={<Timer size={15} />} label={value} variant="duration" />;
}
