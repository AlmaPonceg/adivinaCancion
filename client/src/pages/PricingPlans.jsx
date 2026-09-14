import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from '../context/LanguageContext';
import LanguageSelector from '../components/LanguageSelector';

const API_BASE = import.meta.env.VITE_API_URL || '';

export default function PricingPlans() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isAnnual, setIsAnnual] = useState(false);
  const [selectedPlanId, setSelectedPlanId] = useState(() => localStorage.getItem('trivia_user_plan') || 'free');
  const [toastMsg, setToastMsg] = useState(null);
  const [isActivating, setIsActivating] = useState(null);

  const showToast = (text, type = 'success') => {
    setToastMsg({ text, type });
    setTimeout(() => setToastMsg(null), 4000);
  };

  useEffect(() => {
    async function loadPlans() {
      try {
        const res = await fetch(`${API_BASE}/api/plans`);
        const data = await res.json();
        if (data.success && Array.isArray(data.plans)) {
          setPlans(data.plans);
        }
      } catch (err) {
        console.error('Error al cargar planes:', err);
      } finally {
        setLoading(false);
      }
    }
    loadPlans();
  }, []);

  const handleSelectPlan = async (plan) => {
    if (!plan.enabled) {
      showToast(t('plans.paused', 'Este plan no está disponible para nuevas suscripciones.'), 'error');
      return;
    }

    setIsActivating(plan.id);

    try {
      const username = localStorage.getItem('trivia_player_name') || 'Mi Usuario';
      const res = await fetch(`${API_BASE}/api/user/plan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, planId: plan.id }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'No se pudo activar el plan');
      }

      localStorage.setItem('trivia_user_plan', plan.id);
      setSelectedPlanId(plan.id);
      showToast(t('plans.planActivated', '¡Plan activado con éxito!'), 'success');
    } catch (err) {
      showToast(err.message || 'Error al seleccionar plan', 'error');
    } finally {
      setIsActivating(null);
    }
  };

  return (
    <div className="min-h-screen bg-[#F5F2EB] text-[#181226] py-10 px-4 sm:px-6 lg:px-8">
      {/* Toast Notification */}
      {toastMsg && (
        <div className={`fixed top-5 right-5 z-50 px-4 py-3 rounded-2xl shadow-xl border-2 flex items-center gap-2.5 text-xs font-black transition-all ${
          toastMsg.type === 'error'
            ? 'bg-[#FEF2F2] border-[#FCA5A5] text-[#B91C1C]'
            : 'bg-[#ECFDF5] border-[#6EE7B7] text-[#065F46]'
        }`}>
          <span className="w-2 h-2 rounded-full bg-current" />
          <span>{toastMsg.text}</span>
        </div>
      )}

      <div className="max-w-7xl mx-auto">
        {/* Top Bar with Back Link & Language Selector */}
        <div className="flex items-center justify-between mb-8">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white border-2 border-[#EAE3D5] text-xs font-black text-[#181226] hover:bg-[#FAF8F5] transition-all cursor-pointer shadow-xs"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
            </svg>
            <span>{t('common.back', 'Volver')}</span>
          </button>

          <div className="flex items-center gap-3">
            <LanguageSelector />
            <Link
              to="/admin"
              className="text-xs font-bold text-[#746B8A] hover:text-[#181226] transition-colors"
            >
              {t('plans.moderationLink', 'Panel de Moderación →')}
            </Link>
          </div>
        </div>

        {/* Title Header */}
        <div className="text-center max-w-2xl mx-auto mb-10">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#EDE9FE] border border-[#DDD6FE] text-[11px] font-black uppercase tracking-wider text-[#46178F] mb-3">
            <svg className="w-3.5 h-3.5 text-[#46178F]" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
            </svg>
            <span>{t('plans.badge', 'Planes para Cada Escenario')}</span>
          </div>

          <h1 className="font-display font-black text-3xl sm:text-4xl text-[#181226] tracking-tight mb-3">
            {t('plans.title', 'Elegí la experiencia perfecta para tus partidas')}
          </h1>
          <p className="text-sm font-medium text-[#64748B] leading-relaxed">
            {t('plans.subtitle', 'Desde juntadas casuales en el living hasta concursos multitudinarios en vivo con DJ Bot y pulsadores ultra rápidos.')}
          </p>

          {/* Billing Cycle Toggle */}
          <div className="mt-6 inline-flex items-center p-1.5 rounded-2xl bg-white border-2 border-[#EAE3D5] shadow-xs">
            <button
              type="button"
              onClick={() => setIsAnnual(false)}
              className={`px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
                !isAnnual
                  ? 'bg-[#181226] text-white shadow-xs'
                  : 'text-[#64748B] hover:text-[#181226]'
              }`}
            >
              {t('plans.monthly', 'Facturación Mensual')}
            </button>
            <button
              type="button"
              onClick={() => setIsAnnual(true)}
              className={`px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 ${
                isAnnual
                  ? 'bg-[#181226] text-white shadow-xs'
                  : 'text-[#64748B] hover:text-[#181226]'
              }`}
            >
              <span>{t('plans.yearly', 'Facturación Anual')}</span>
              <span className="px-1.5 py-0.5 rounded-md bg-[#00E676] text-[#0A5C36] text-[10px] font-black">
                -20%
              </span>
            </button>
          </div>
        </div>

        {/* Pricing Cards Grid */}
        {loading ? (
          <div className="py-20 text-center text-sm font-bold text-[#64748B]">
            {t('plans.loadingPlans', 'Cargando catálogo de planes...')}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 items-stretch">
            {plans.map((p) => {
              const isSelected = selectedPlanId === p.id;
              const isPlus = p.id === 'plus';
              const isPro = p.id === 'pro';
              const isUltra = p.id === 'ultra';
              const isFree = p.id === 'free';
              const isCurrentDisabled = !p.enabled;

              const price = isFree
                ? 0
                : isAnnual
                ? Math.round((p.priceYearly || p.priceMonthly * 10) / 12)
                : p.priceMonthly;

              return (
                <div
                  key={p.id}
                  className={`arcade-card-pop rounded-3xl flex flex-col justify-between overflow-hidden transition-all relative bg-white ${
                    isPro
                      ? 'border-[#46178F] ring-2 ring-[#46178F]/20'
                      : isUltra
                      ? 'border-[#00C853] ring-2 ring-[#00C853]/20'
                      : 'border-[#EAE3D5]'
                  } ${isCurrentDisabled ? 'opacity-70 grayscale-30' : ''}`}
                >
                  {/* Top Badge Ribbon */}
                  <div
                    className="py-2.5 px-4 text-[10px] font-black uppercase tracking-wider text-center text-white shadow-xs"
                    style={{ backgroundColor: p.accentColor || '#46178F' }}
                  >
                    {t(`plans.tiers.${p.id}.badge`, p.badge || 'Plan Hitpop!')}
                  </div>

                  <div className="p-6 flex-1 flex flex-col justify-between">
                    <div>
                      {/* Plan Name & Tagline */}
                      <div className="flex items-center justify-between mb-2">
                        <h2 className="font-display font-black text-2xl text-[#181226]">
                          {t(`plans.tiers.${p.id}.name`, p.name)}
                        </h2>
                        {isSelected && (
                          <span className="px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase bg-[#00E676] text-[#0A5C36]">
                            {t('plans.active', 'Activo')}
                          </span>
                        )}
                      </div>

                      <p className="text-xs font-medium text-[#64748B] mb-5 min-h-[36px] leading-relaxed">
                        {t(`plans.tiers.${p.id}.tagline`, p.tagline)}
                      </p>

                      {/* Price Display */}
                      <div className="mb-5 pb-5 border-b border-[#EAE3D5]">
                        {isFree ? (
                          <div className="font-display font-black text-3xl text-[#181226]">
                            {t('plans.free', 'Gratis')}
                          </div>
                        ) : (
                          <div>
                            <div className="flex items-baseline gap-1">
                              <span className="text-xs font-bold text-[#64748B]">{t('plans.from', 'Desde')}</span>
                              <span className="font-display font-black text-3xl text-[#181226]">
                                ${price}
                              </span>
                              <span className="text-xs font-bold text-[#64748B]">{t('plans.perMonth', '/ mes')}</span>
                            </div>
                            {p.discountText && (
                              <div className="text-[11px] font-bold text-[#FF5722] mt-0.5">
                                {t(`plans.tiers.${p.id}.discountText`, p.discountText)}
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Feature Bullets */}
                      <div className="space-y-2.5 mb-6">
                        <div className="text-[10px] font-black uppercase tracking-wider text-[#94A3B8]">
                          {t('plans.includes', 'Incluye:')}
                        </div>
                        {p.features?.map((feat, idx) => (
                          <div key={idx} className="flex items-start gap-2 text-xs font-semibold text-[#181226]">
                            <span className="text-[#00C853] font-black shrink-0">✓</span>
                            <span>{t(`plans.tiers.${p.id}.features.${idx}`, feat)}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Action Button */}
                    <div className="pt-2">
                      {isCurrentDisabled ? (
                        <button
                          type="button"
                          disabled
                          className="w-full py-3 px-4 rounded-2xl bg-gray-200 text-gray-500 text-xs font-black uppercase tracking-wider cursor-not-allowed text-center"
                        >
                          {t('plans.paused', 'Pausado por Moderación')}
                        </button>
                      ) : isSelected ? (
                        <button
                          type="button"
                          disabled
                          className="w-full py-3 px-4 rounded-2xl bg-[#E8FDF3] border-2 border-[#6EE7B7] text-[#065F46] text-xs font-black uppercase tracking-wider cursor-default text-center flex items-center justify-center gap-2"
                        >
                          <span>{t('plans.selected', '✓ Plan Seleccionado')}</span>
                        </button>
                      ) : isPlus ? (
                        <button
                          type="button"
                          disabled={isActivating === p.id}
                          onClick={() => handleSelectPlan(p)}
                          className="w-full arcade-btn arcade-btn-ruby py-3 text-xs uppercase cursor-pointer"
                        >
                          {isActivating === p.id ? t('plans.activating', 'Activando...') : `${t('plans.choose', 'Elegir')} ${t(`plans.tiers.${p.id}.name`, p.name)}`}
                        </button>
                      ) : isPro ? (
                        <button
                          type="button"
                          disabled={isActivating === p.id}
                          onClick={() => handleSelectPlan(p)}
                          className="w-full arcade-btn arcade-btn-purple py-3 text-xs uppercase cursor-pointer"
                        >
                          {isActivating === p.id ? t('plans.activating', 'Activando...') : `${t('plans.choose', 'Elegir')} ${t(`plans.tiers.${p.id}.name`, p.name)}`}
                        </button>
                      ) : isUltra ? (
                        <button
                          type="button"
                          disabled={isActivating === p.id}
                          onClick={() => handleSelectPlan(p)}
                          className="w-full arcade-btn arcade-btn-lime py-3 text-xs uppercase cursor-pointer"
                        >
                          {isActivating === p.id ? t('plans.activating', 'Activando...') : `${t('plans.choose', 'Elegir')} ${t(`plans.tiers.${p.id}.name`, p.name)}`}
                        </button>
                      ) : (
                        <button
                          type="button"
                          disabled={isActivating === p.id}
                          onClick={() => handleSelectPlan(p)}
                          className="w-full py-3 px-4 rounded-2xl bg-white border-2 border-[#181226] text-[#181226] hover:bg-[#FAF8F5] text-xs font-black uppercase tracking-wider cursor-pointer transition-all shadow-xs"
                        >
                          {isActivating === p.id ? t('plans.activating', 'Activando...') : t('plans.startFree', 'Comenzar Gratis')}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Feature Comparison / Arcade Showcase Banner */}
        <div className="mt-16 bg-white border-2 border-[#EAE3D5] rounded-3xl p-6 sm:p-10 shadow-sm flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="max-w-xl">
            <span className="text-[10px] font-black uppercase tracking-wider text-[#FF5722] bg-[#FFF2EE] px-3 py-1 rounded-full">
              {t('plans.syncBadge', 'Sincronización Total en Tiempo Real')}
            </span>
            <h2 className="font-display font-black text-2xl sm:text-3xl text-[#181226] mt-3 mb-2">
              {t('plans.bannerTitle', 'Elige el plan y desbloquea el potencial completo de tus eventos')}
            </h2>
            <p className="text-xs sm:text-sm text-[#64748B] leading-relaxed">
              {t('plans.bannerDesc', 'Todos los planes incluyen conexión de pulsadores con latencia ultra baja, pantalla gigante para el proyector o TV, y compatibilidad total con cualquier dispositivo móvil sin descargar apps.')}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={() => navigate('/library')}
              className="arcade-btn arcade-btn-ruby px-6 py-3.5 text-xs font-black uppercase cursor-pointer"
            >
              {t('plans.exploreCatalog', 'Explorar Catálogo')}
            </button>
            <button
              type="button"
              onClick={() => navigate('/host')}
              className="px-5 py-3.5 rounded-2xl bg-white border-2 border-[#EAE3D5] hover:bg-[#FAF8F5] text-xs font-black text-[#181226] transition-all cursor-pointer shadow-xs"
            >
              {t('plans.createRoom', 'Crear Sala')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
