import { Cpu } from 'lucide-react';
import GlassChip from './GlassChip';

interface Props {
  value: number;
}

export default function CpuChip({ value }: Props) {
  return <GlassChip icon={<Cpu size={15} />} label={value} variant="cpu" />;
}
