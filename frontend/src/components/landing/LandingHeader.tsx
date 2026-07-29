import { useNavigate } from 'react-router-dom';
import { GraduationCap, Cpu, BookOpen } from 'lucide-react';
import { INSTITUTIONAL } from '../../constants/landing';

export default function LandingHeader() {
  const navigate = useNavigate();

  return (
    <header className="landing-header">
      <div className="landing-brand">
        <div className="landing-logo-placeholder">
          <div className="landing-logo-icon">
            <GraduationCap size={22} />
          </div>
          <div>
            <div className="landing-univ">{INSTITUTIONAL.university}</div>
            <div className="landing-career">{INSTITUTIONAL.career}</div>
          </div>
        </div>
        <div className="landing-subject-line">
          <span className="landing-subject">{INSTITUTIONAL.subject}</span>
          <span className="landing-subject-sep" />
          <span className="landing-cycle">{INSTITUTIONAL.cycle}</span>
        </div>
      </div>

      <div className="landing-actions">
        <div
          className="landing-action-card"
          onClick={() => navigate('/create')}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => { if (e.key === 'Enter') navigate('/create'); }}
          aria-label="Crear nuevo ejercicio"
        >
          <div className="landing-action-icon">
            <Cpu size={24} />
          </div>
          <div className="landing-action-label">Crear nuevo ejercicio</div>
          <div className="landing-action-hint">Diseña un caso de planificación</div>
        </div>

        <div
          className="landing-action-card"
          onClick={() => navigate('/library')}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => { if (e.key === 'Enter') navigate('/library'); }}
          aria-label="Biblioteca de ejercicios"
        >
          <div className="landing-action-icon">
            <BookOpen size={24} />
          </div>
          <div className="landing-action-label">Biblioteca de ejercicios</div>
          <div className="landing-action-hint">Explora casos guardados</div>
        </div>
      </div>
    </header>
  );
}
