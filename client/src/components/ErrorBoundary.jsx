import React from 'react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Unhandled UI error caught by ErrorBoundary:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.href = '/';
  };

  handleReload = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-dvh flex items-center justify-center p-4 sm:p-6 text-[var(--color-text-primary)]">
          <div className="party-card p-6 sm:p-8 rounded-[2rem] max-w-md w-full text-center relative overflow-hidden shadow-2xl">
            <div className="w-12 h-12 rounded-2xl bg-[#FFF0F3] border border-[#FDA4AF] flex items-center justify-center mx-auto mb-4 text-[#E11D48]">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>

            <h2 className="font-display text-lg sm:text-xl font-black text-[#181226] mb-2">
              Se produjo un error en la vista
            </h2>
            <p className="text-xs text-[#6B6280] font-medium mb-6 leading-relaxed">
              La aplicación detectó una excepción inesperada. Podés recargar la pantalla para reanudar la partida o volver a la sala de espera.
            </p>

            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button
                type="button"
                onClick={this.handleReload}
                className="arcade-btn-primary px-5 py-3 rounded-xl text-xs font-black shadow-md cursor-pointer"
              >
                Recargar Pantalla
              </button>
              <button
                type="button"
                onClick={this.handleReset}
                className="arcade-btn px-5 py-3 rounded-xl text-xs font-bold text-[#6B6280] hover:text-[#181226] border border-[#EAE3D5] cursor-pointer"
              >
                Volver al Inicio
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
