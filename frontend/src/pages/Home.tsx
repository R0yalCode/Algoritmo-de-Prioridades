import { useNavigate } from 'react-router-dom';
import Hero from '../components/landing/Hero';
import EducationalCards from '../components/landing/EducationalCards';

export default function Home() {
  const navigate = useNavigate();

  return (
    <div className="home-page">
      <Hero
        onNewExercise={() => navigate('/create')}
        onLibrary={() => navigate('/library')}
      />
      <EducationalCards />
    </div>
  );
}
