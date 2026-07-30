import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import { Loader2 } from 'lucide-react';
import SimulationProvider from './state/SimulationProvider';

const Home = lazy(() => import('./pages/Home'));
const CreateExercise = lazy(() => import('./components/exercise/CreateExercisePage'));
const Simulation = lazy(() => import('./pages/Simulation'));
const HistoryView = lazy(() => import('./pages/HistoryView'));
const Results = lazy(() => import('./pages/Results'));
const Library = lazy(() => import('./pages/Library'));

function LoadingFallback() {
  return (
    <div className="page-loading">
      <Loader2 size={32} className="spinning" />
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <SimulationProvider>
        <div className="app">
          <Suspense fallback={<LoadingFallback />}>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/create" element={<CreateExercise />} />
              <Route path="/library" element={<Library />} />
              <Route path="/simulation/:simId" element={<Simulation />} />
              <Route path="/timeline/:simId" element={<HistoryView />} />
              <Route path="/results/:simId" element={<Results />} />
            </Routes>
          </Suspense>
        </div>
      </SimulationProvider>
    </BrowserRouter>
  );
}
