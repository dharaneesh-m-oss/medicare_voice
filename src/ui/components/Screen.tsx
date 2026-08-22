import type { ReactNode } from 'react';

import { useApp } from '../../app/AppState';
import { useNavigator } from '../../app/Navigator';
import { Icon } from './Icon';

interface ScreenProps {
  title: string;
  children: ReactNode;
  /** Extra control in the header (e.g. a Listen button). */
  action?: ReactNode;
  showBack?: boolean;
}

/** Every screen has exactly one visible way back. */
export function Screen({ title, children, action, showBack = true }: ScreenProps) {
  const { goBack, depth } = useNavigator();
  const { t } = useApp();

  return (
    <section className="screen">
      <header className="screen-header">
        {showBack && depth > 1 && (
          <button type="button" className="header-btn" onClick={goBack} aria-label={t('common.back')}>
            <Icon name="back" size={24} />
          </button>
        )}
        <h1>{title}</h1>
        {action}
      </header>
      <div className="screen-body">{children}</div>
    </section>
  );
}
