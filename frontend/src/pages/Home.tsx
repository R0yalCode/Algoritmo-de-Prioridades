import { motion } from 'framer-motion';
import LandingHeader from '../components/landing/LandingHeader';
import LandingHero from '../components/landing/LandingHero';
import AlgorithmFundamentals from '../components/landing/AlgorithmFundamentals';
import MetricsPanel from '../components/landing/MetricsPanel';
import TeamCarousel from '../components/landing/TeamCarousel';
import LandingFooter from '../components/landing/LandingFooter';

export default function Home() {
  return (
    <motion.div
      className="home-page"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
    >
      <LandingHeader />
      <LandingHero />
      <AlgorithmFundamentals />
      <MetricsPanel />
      <TeamCarousel />
      <LandingFooter />
    </motion.div>
  );
}
