

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import MotionController from '../motion/MotionController';
import Collapse from '../motion/Collapse';
import { MotionSection, MotionDiv } from '../components/MotionSection';
import { staggerContainer, fadeInUp, fadeIn, motionTokens } from '../motion/tokens';
import { useNavigate } from 'react-router-dom';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, ComposedChart, Line, ReferenceLine, Legend, CartesianGrid } from 'recharts';
import { useFieldContext } from '../contexts/FieldContext';
import { useFields, useFieldEndpoint } from '../api/fields';
import FieldSwitcher from '../components/FieldSwitcher';
import * as turf from '@turf/turf';
import { MapContainer, TileLayer, Polygon, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';


function MapBounds({ activeFarm, farms }) {
    const map = useMap();
    useEffect(() => {
        if (activeFarm && activeFarm.geometry) {
            try {
                const poly = turf.polygon(activeFarm.geometry.coordinates);
                const bbox = turf.bbox(poly);
                map.fitBounds([
                    [bbox[1], bbox[0]],
                    [bbox[3], bbox[2]]
                ], { padding: [20, 20], maxZoom: 17, animate: true });
            } catch(e) {}
        } else if (farms && farms.length > 0) {
            try {
                const fc = turf.featureCollection(farms.filter(f => f.geometry).map(f => turf.polygon(f.geometry.coordinates)));
                const bbox = turf.bbox(fc);
                map.fitBounds([
                    [bbox[1], bbox[0]],
                    [bbox[3], bbox[2]]
                ], { padding: [50, 50], animate: true });
            } catch(e) {}
        }
    }, [activeFarm, farms, map]);
    return null;
}

export default function DashboardRaw({ user, onLogout, mode }) {
    const { selectedFieldId, setSelectedFieldId } = useFieldContext();
    const [openPlanDay, setOpenPlanDay] = useState(0);
    const [doneDays, setDoneDays] = useState({});
    const [showTour, setShowTour] = useState(false);
    const [tourStep, setTourStep] = useState(0);
    const [compareData, setCompareData] = useState(null);
    const { data: farms, loading: farmsLoading } = useFields(user);

    const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';
    useEffect(() => {
        if (user) {
            fetch(`${API_BASE}/api/compare`, {
                headers: { 'Authorization': `Bearer ${user.token}` }
            }).then(r => r.json()).then(d => setCompareData(d.data)).catch(e => console.error(e));
        }
    }, [user, API_BASE]);
    
    
    // Automatically select the first field if 'all' is selected but we don't support 'all' for this UI yet,
    // or just default to first field if null.
    useEffect(() => {
        if (selectedFieldId === 'all' && farms && farms.length > 0) {
            setSelectedFieldId(farms[0].id);
        }
    }, [selectedFieldId, farms, setSelectedFieldId]);

    const activeFarmId = selectedFieldId === 'all' ? null : selectedFieldId;
    
    const { data: activeFarm, meta: farmMeta, loading: farmLoading } = useFieldEndpoint(user, activeFarmId, 'overview');
    const [weather, setWeather] = useState(null);
    const [weatherLoading, setWeatherLoading] = useState(true);

    useEffect(() => {
        if (!activeFarm || !activeFarm.centroid) {
            setWeather(null);
            return;
        }
        const [lat, lon] = activeFarm.centroid;
        setWeatherLoading(true);
        fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,uv_index_max,wind_speed_10m_max,wind_direction_10m_dominant,wind_gusts_10m_max&timezone=auto&past_days=2&forecast_days=8`)
            .then(res => res.json())
            .then(data => {
                if (data.daily) {
                    const formatted = data.daily.time.map((timeStr, idx) => ({
                        date: timeStr,
                        dayOfWeek: new Date(timeStr).toLocaleDateString('en-US', { weekday: 'short' }),
                        max_temp: data.daily.temperature_2m_max[idx],
                        min_temp: data.daily.temperature_2m_min[idx],
                        precipitation: data.daily.precipitation_sum[idx],
                        uv_index: data.daily.uv_index_max[idx],
                        icon: data.daily.precipitation_sum[idx] > 0 ? "rainy" : "sunny"
                    }));
                    setWeather(formatted);
                    
                    const todayStr = new Date().toISOString().split('T')[0];
                    const todayW = formatted.find(w => w.date === todayStr) || formatted[0];
                    setActiveWeatherDate(todayW.date);
                    setActiveWeather(todayW);
                    setExpandedDay(todayW.date);
                }
                setWeatherLoading(false);
            })
            .catch(err => {
                console.error(err);
                setWeatherLoading(false);
            });
    }, [activeFarm]);
    const { data: satData, loading: satLoading } = useFieldEndpoint(user, activeFarmId, 'telemetry');
    const { data: soilData, loading: soilLoading } = useFieldEndpoint(user, activeFarmId, 'soil');
    const { data: predictions, loading: predLoading } = useFieldEndpoint(user, activeFarmId, 'yield');
    const { data: actionPlan, loading: planLoading } = useFieldEndpoint(user, activeFarmId, 'plan');
    const { data: zones, loading: zonesLoading } = useFieldEndpoint(user, activeFarmId, 'zones');
    const { data: insightsData, loading: insightsLoading } = useFieldEndpoint(user, activeFarmId, 'insights');

    const [activeWeatherDate, setActiveWeatherDate] = useState(null);
    const [activeWeather, setActiveWeather] = useState(null);
    const [expandedDay, setExpandedDay] = useState(null);

    
  useEffect(() => {
    const style = document.createElement('style');
    style.innerHTML = `
      @media print {
        body * { visibility: hidden; }
        .print\\:block, .print\\:block * { visibility: visible; }
        .print\\:block { position: absolute; left: 0; top: 0; width: 100%; }
        .print\\:hidden { display: none !important; }
      }
    `;
    document.head.appendChild(style);
    return () => document.head.removeChild(style);
  }, []);

  const calcMetrics = () => {
        let areaAcres = 0;
        let perimeterMeters = 0;
        let vertices = 0;
        
        const fList = activeFarm ? [activeFarm] : (farms || []);
        
        fList.forEach(f => {
            if (f.geometry) {
                // GeoJSON polygon
                try {
                    const poly = turf.polygon(f.geometry.coordinates);
                    areaAcres += turf.area(poly) * 0.000247105; // sq meters to acres
                    perimeterMeters += turf.length(poly, {units: 'meters'});
                    vertices += f.geometry.coordinates?.[0]?.length || 0;
                } catch (e) {
                    console.error("Turf calc error", e);
                }
            } else if (f.areaAcres) {
                areaAcres += f.areaAcres;
            }
        });
        return { areaAcres, perimeterMeters, vertices, count: fList.length };
    };
    const metrics = calcMetrics();




    const handleWeatherClick = (w) => {
        setActiveWeatherDate(w.date);
        setActiveWeather(w);
    };

    const toggleTask = (planId) => {
        // Optimistic update
        setDoneDays(prev => {
            const next = {...prev};
            next[planId] = !next[planId];
            return next;
        });
        
        fetch(`${API_BASE}/api/farms/${activeFarmId}/plan/${planId}/toggle`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${user.token}` }
        })
        .then(r => {
            if (!r.ok) throw new Error('Failed');
            return r.json();
        })
        .catch(err => {
            // Rollback
            setDoneDays(prev => {
                const next = {...prev};
                next[planId] = !next[planId];
                return next;
            });
        });
    };


    return (
        <div className="bg-background font-body-md text-on-surface antialiased selection:bg-secondary selection:text-on-secondary">
        <MotionController />
{mode === 'demo' && (
<div className="w-full bg-[#38BDF8]/10 border-b border-[#38BDF8]/20 text-[#38BDF8] text-center text-xs py-1.5 font-mono tracking-wide z-[60] relative">
Weather & map are live. Soil, NDVI and yield are simulated demo data.
</div>
)}
            <motion.header initial="hidden" animate="show" variants={fadeIn} className="fixed top-0 left-0 w-full z-50 flex flex-col"><div className="w-full h-8 bg-primary text-on-primary font-label-sm text-label-sm border-b border-primary-container px-space-lg flex items-center justify-between"><div className="flex items-center gap-space-sm"><span className="w-1.5 h-1.5 rounded-full bg-secondary-fixed animate-pulse"></span><a className="hover:text-primary-fixed transition-colors" data-path="field-action-plans" href="#">New: 7-day field action plans +'</a></div><div className="flex items-center gap-space-xl"> <a className="hover:text-primary-fixed transition-colors" data-path="login" href="#" onClick={(e) => { if (user) { e.preventDefault(); onLogout(); } }}>{user ? user.name + " (Log out)" : "Log in"}</a><button className="flex items-center gap-1 hover:text-primary-fixed transition-colors font-label-sm text-label-sm"><span>EN</span><span className="material-symbols-outlined text-[14px]">expand_more</span></button></div></div><div className="w-full h-16 bg-surface-container-lowest/80 backdrop-blur-xl border-b border-outline-variant/40"><div className="w-full max-w-[1440px] mx-auto h-full px-space-xl flex items-center justify-between"><div className="flex items-center gap-space-xl"><a className="flex items-center gap-[10px] group" aria-label="TerraOrbit home" data-path="home" href="#"><img src="terra-orbit-logo.png" width="40" height="40" alt="" className="w-[36px] h-[36px] sm:w-[40px] sm:h-[40px] rounded-full object-cover shrink-0 shadow-[0_0_20px_rgba(34,197,94,0.25)]" /><div className="flex items-baseline font-headline-sm text-headline-sm tracking-tight "><span className="brand text-primary">Terra<span className="brand-orbit">Orbit</span></span></div></a><nav className="hidden md:flex items-center gap-space-md" data-active-classes="text-primary font-bold bg-surface-container"><a className="px-space-md py-space-xs rounded font-body-md text-body-md text-on-surface-variant hover:text-on-surface hover:bg-surface-container-low transition-all" href="#features">Features</a><a className="px-space-md py-space-xs rounded font-body-md text-body-md text-on-surface-variant hover:text-on-surface hover:bg-surface-container-low transition-all" href="#how-it-works">How it works</a><a className="px-space-md py-space-xs rounded font-body-md text-body-md text-on-surface-variant hover:text-on-surface hover:bg-surface-container-low transition-all" href="#weather">Weather</a><a className="px-space-md py-space-xs rounded font-body-md text-body-md text-on-surface-variant hover:text-on-surface hover:bg-surface-container-low transition-all" href="#insights">Insights</a></nav></div><div className="flex items-center gap-space-md"><a className="hidden sm:flex items-center justify-center font-label-lg text-label-lg px-space-md py-space-xs rounded text-on-surface-variant hover:text-on-surface transition-colors" href="#console">Console</a>

<select id="farm-selector" className="bg-black/40 text-white border border-white/20 rounded-xl px-4 py-2 font-mono text-xs focus:outline-none focus:border-[#22C55E]" value={selectedFieldId} onChange={e => setSelectedFieldId(e.target.value)}>
    {farms && farms.map(f => <option key={f.id} value={f.id}>{f.name} - {f.crop}</option>)}
</select>

<a className="flex items-center justify-center min-h-[48px] px-space-xl rounded-full bg-secondary text-on-secondary font-label-lg text-label-lg hover:bg-primary transition-all shadow-[0_2px_8px_rgba(0,109,56,0.25)]" href="#console">Get Started</a></div></div></div></motion.header><main className="w-full pt-24 bg-[#050B08] text-white min-h-[calc(100vh-160px)]"><div className="flex flex-col w-full relative overflow-hidden font-[-apple-system,BlinkMacSystemFont,'SF_Pro_Display','Inter',sans-serif]">

<div className="pointer-events-none absolute -top-40 -right-40 w-[900px] h-[750px] bg-gradient-to-bl from-[#38BDF8]/15 via-[#1F8A4D]/10 to-transparent blur-[140px] z-0"></div>
<div className="pointer-events-none absolute top-[480px] left-1/2 -translate-x-1/2 w-[850px] h-[550px] bg-[#1F8A4D]/12 blur-[160px] z-0"></div>
<div className="pointer-events-none absolute top-[2800px] -left-60 w-[700px] h-[700px] bg-[#22C55E]/8 blur-[180px] z-0"></div>
<div className="pointer-events-none absolute top-[5200px] -right-40 w-[800px] h-[800px] bg-[#38BDF8]/8 blur-[180px] z-0"></div>

<div className="w-full max-w-[1440px] mx-auto px-6 lg:px-12 relative z-10 flex flex-col space-y-28 lg:space-y-40 pb-28">



<motion.section initial="hidden" animate="show" variants={staggerContainer} className="pt-8 lg:pt-16 flex flex-col items-center text-center relative">

<div className="inline-flex items-center gap-2.5 px-4 py-1.5 rounded-full bg-white/[0.04] border border-white/10 backdrop-blur-xl mb-8 group hover:border-[#22C55E]/40 transition-all cursor-pointer">
<span className="relative flex h-2 w-2">
<span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#22C55E] opacity-75"></span>
<span className="relative inline-flex rounded-full h-2 w-2 bg-[#22C55E]"></span>
</span>
<span className="text-xs font-medium tracking-wide text-white/90">New · Satellite crop forecasts</span>
<span className="text-white/40 text-xs font-mono">→</span>
</div>

<motion.h1 variants={fadeInUp} className="text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-[-0.03em] leading-[1.08] max-w-4xl text-white">
        Your farm, seen from <span className="bg-gradient-to-r from-[#22C55E] via-[#4ADE80] to-[#38BDF8] bg-clip-text text-transparent">orbit.</span>
</motion.h1>

<motion.p variants={fadeInUp} className="mt-6 text-base sm:text-lg lg:text-xl text-white/60 max-w-2xl font-normal leading-relaxed">
        Satellite-powered field intelligence for every acre: boundaries, soil, crop health, micro-weather, and a 7-day tactical action plan.
      </motion.p>

<motion.div variants={fadeInUp} className="mt-8 flex flex-wrap items-center justify-center gap-4">


<select id="farm-selector" className="bg-black/40 text-white border border-white/20 rounded-xl px-4 py-2 font-mono text-xs focus:outline-none focus:border-[#22C55E]" value={selectedFieldId} onChange={e => setSelectedFieldId(e.target.value)}>
    {farms && farms.map(f => <option key={f.id} value={f.id}>{f.name} - {f.crop}</option>)}
</select>

<a className="inline-flex items-center justify-center px-8 py-3.5 rounded-full bg-[#1F8A4D] hover:bg-[#18703e] text-white text-sm font-semibold tracking-wide transition-all shadow-[0_0_30px_rgba(31,138,77,0.45)] hover:shadow-[0_0_45px_rgba(34,197,94,0.6)]" href="#console">
          Get Started
        </a>
<button onClick={() => setShowTour(true)} className="inline-flex items-center gap-2 px-7 py-3.5 rounded-full bg-white/[0.04] hover:bg-white/[0.08] border border-white/15 backdrop-blur-xl text-white/90 text-sm font-medium tracking-wide transition-all" type="button">
<span className="material-symbols-outlined text-[18px] text-[#22C55E]">play_circle</span>
          Watch demo
        </button>
</motion.div>

<motion.div variants={fadeInUp} className="mt-10 flex items-center gap-3 px-4 py-1.5 rounded-lg bg-black/40 border border-white/5 font-mono text-[11px] text-white/60">
<span className="w-1.5 h-1.5 rounded-full bg-[#38BDF8] animate-pulse"></span>
<span>SENTINEL-2C SYNCHRONIZED</span>
<span className="text-white/20">•</span>
<span>LAT: 28A38'42.1"N</span>
<span className="text-white/20">•</span>
<span>RES: 10CM HYPERSPECTRAL</span>
</motion.div>

<motion.div variants={fadeInUp} className="mt-12 w-full max-w-6xl relative rounded-3xl bg-white/[0.02] p-2 sm:p-3 border border-white/10 backdrop-blur-2xl shadow-2xl">

<svg className="pointer-events-none absolute -inset-6 sm:-inset-10 w-[calc(100%+3rem)] sm:w-[calc(100%+5rem)] h-[calc(100%+3rem)] sm:h-[calc(100%+5rem)] z-20" fill="none" viewBox="0 0 1200 700">
<ellipse cx="600" cy="350" opacity="0.45" rx="580" ry="320" stroke="url(#orbitGrad)" strokeDasharray="8 6" strokeWidth="1" />

<circle cx="1060" cy="220" fill="#38BDF8" filter="url(#glow)" r="5" />
<animate attributeName="opacity" dur="3s" repeatCount="indefinite" values="0.7;1;0.7"></animate>

<circle cx="1060" cy="220" opacity="0.4" r="10" stroke="#38BDF8" strokeWidth="1" />
<defs>
<linearGradient gradientUnits="userSpaceOnUse" id="orbitGrad" x1="0" x2="1200" y1="0" y2="700">
<stop stopColor="#22C55E" stopOpacity="0.1"></stop>
<stop offset="0.5" stopColor="#38BDF8" stopOpacity="0.7"></stop>
<stop offset="1" stopColor="#22C55E" stopOpacity="0.1"></stop>
</linearGradient>
<filter height="140%" id="glow" width="140%" x="-20%" y="-20%">
<feGaussianBlur result="blur" stdDeviation="4"></feGaussianBlur>
<feComposite in="SourceGraphic" in2="blur" operator="over"></feComposite>
</filter>
</defs>
</svg>

<div className="relative w-full aspect-[16/10] sm:aspect-[16/9] rounded-2xl overflow-hidden bg-[#0A120D] border border-white/10 flex flex-col justify-between p-4 sm:p-8">

<div className="absolute inset-0 z-0 bg-cover bg-center opacity-70">
<MapContainer center={[23.2156, 72.6369]} zoom={13} style={{ width: '100%', height: '100%' }} zoomControl={false} dragging={false} scrollWheelZoom={false} doubleClickZoom={false} touchZoom={false}>
    <TileLayer url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}" attribution="Tiles &copy; Esri" />
    {farms && farms.map(f => {
        if (!f.geometry) return null;
        const isActive = activeFarm && activeFarm.id === f.id;
        
        // Reverse coordinates from [lon, lat] to [lat, lon] for Leaflet
        const positions = f.geometry.coordinates[0].map(coord => [coord[1], coord[0]]);
        
        return (
            <Polygon 
                key={f.id} 
                positions={positions} 
                pathOptions={{ 
                    color: isActive ? '#22C55E' : '#38BDF8', 
                    weight: isActive ? 4 : 1,
                    fillOpacity: isActive ? 0.2 : 0.05
                }} 
            />
        );
    })}
    <MapBounds activeFarm={activeFarm} farms={farms} />
</MapContainer>
</div>

<div className="relative z-10 flex flex-wrap items-center justify-between gap-4 font-mono text-xs">
<div className="flex items-center gap-3 bg-black/60 backdrop-blur-md px-3.5 py-2 rounded-xl border border-white/10">
<span className="w-2 h-2 rounded-full bg-[#22C55E]"></span>
<span className="text-white/80 font-semibold tracking-wider" id="val-farm-name">LIVE TELEMETRY • {activeFarm?.name?.toUpperCase() || "LOADING..."}</span>
<span className="text-white/30">|</span>
<span className="text-white/50" id="val-coords">{activeFarm ? `${activeFarm.centroid[0].toFixed(4)}AN ${activeFarm.centroid[1].toFixed(4)}AE` : "--"}</span>
</div>
<div className="hidden sm:flex items-center gap-4 bg-black/60 backdrop-blur-md px-3.5 py-2 rounded-xl border border-white/10 text-white/70">
<span>ELEV: <strong className="text-white">284m MSL</strong></span>
<span>SCALE: <strong className="text-white">1:2500 (200m)</strong></span>
<span className="text-[#38BDF8] flex items-center gap-1">
<span className="material-symbols-outlined text-[14px]">satellite_alt</span> S2C ORBIT
              </span>
</div>
</div>

<div className="relative z-10 grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mt-auto pt-6">

<div className="bg-black/65 backdrop-blur-xl border border-white/15 rounded-2xl p-4 flex flex-col justify-between shadow-lg text-left">
<div className="flex items-center justify-between">
<div className="flex items-center gap-1.5 text-xs font-mono text-[#38BDF8]">
<span className="material-symbols-outlined text-[15px]">water_drop</span>
                  SOIL MOISTURE
                </div>
<span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#38BDF8]/15 text-[#38BDF8] border border-[#38BDF8]/30">Optimal Root</span>
</div>
<div className="mt-3 flex items-baseline justify-between">
<div>
<span className="font-mono text-2xl sm:text-3xl font-bold tracking-tight text-white" id="val-moisture">{soilData?.length > 0 ? soilData[0].moisture.toFixed(1) : "--"}%</span>
<span className="text-xs text-white/50 ml-1">VWC</span>
</div>

<svg className="w-16 h-6 text-[#38BDF8]" fill="none" viewBox="0 0 64 24">
<path d="M2 18 L16 12 L30 15 L44 8 L62 10" stroke="currentColor" strokeLinecap="round" strokeWidth="2" />
</svg>
</div>
<p className="text-[11px] text-white/50 mt-1">Nominal hydration at 15cm sensor depth</p>
</div>

<div className="bg-black/65 backdrop-blur-xl border border-[#22C55E]/30 rounded-2xl p-4 flex flex-col justify-between shadow-lg text-left">
<div className="flex items-center justify-between">
<div className="flex items-center gap-1.5 text-xs font-mono text-[#22C55E]">
<span className="material-symbols-outlined text-[15px]">psychiatry</span>
                  CROP HEALTH
                </div>
<span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#22C55E]/15 text-[#22C55E] border border-[#22C55E]/30">+4.1% vs 14d</span>
</div>
<div className="mt-3 flex items-baseline justify-between">
<div>
<span className="font-mono text-2xl sm:text-3xl font-bold tracking-tight text-white" id="val-ndvi">{satData?.length > 0 ? satData[0].ndvi_avg.toFixed(2) : "--"}</span>
<span className="text-xs text-[#22C55E] ml-1">NDVI</span>
</div>
<span className="text-xs font-medium text-white/70">Dense Canopy</span>
</div>
<p className="text-[11px] text-white/50 mt-1">Uniform photosynthetically active biomass</p>
</div>

<div className="bg-black/65 backdrop-blur-xl border border-white/15 rounded-2xl p-4 flex flex-col justify-between shadow-lg text-left">
<div className="flex items-center justify-between">
<div className="flex items-center gap-1.5 text-xs font-mono text-white/70">
<span className="material-symbols-outlined text-[15px]">trending_up</span>
                  PREDICTED YIELD
                </div>
<span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-white/10 text-white/80 border border-white/15">95.8% Conf.</span>
</div>
<div className="mt-3 flex items-baseline justify-between">
<div>
<span className="font-mono text-2xl sm:text-3xl font-bold tracking-tight text-white" id="val-yield">{predictions ? predictions.predicted_yield : "--"}</span>
<span className="text-xs text-white/50 ml-1">Qtl/Acre</span>
</div>
<span className="text-xs font-mono text-[#22C55E] font-medium">+12.4% YoY</span>
</div>
<p className="text-[11px] text-white/50 mt-1">{activeFarm?.crop || "Crop"} phenology active</p>
</div>
</div>
</div>
</motion.div>
</motion.section>



<div className="mt-8 mb-4">
    <FieldSwitcher user={user} />
</div>
<MotionSection className="flex flex-col space-y-10">
<div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
<div>
<div className="font-mono text-xs text-[#22C55E] uppercase tracking-wider mb-2">01 · Cadastral Vectorization</div>
<h2 id="features" className="text-3xl sm:text-4xl font-extrabold tracking-[-0.02em] text-white pt-24 -mt-24">Your land, your borders.</h2>
<p className="mt-3 text-base text-white/60 max-w-xl">
            Autonomous field boundary vectorization down to 10cm accuracy with automated multi-parcel cadastral separation.
          </p>
</div>
<div className="flex items-center gap-2 self-start md:self-auto font-mono text-xs text-white/70 bg-white/[0.03] border border-white/10 px-4 py-2 rounded-xl">
<span className="w-2 h-2 rounded-full bg-[#22C55E]"></span>
<span>COGO GEOMETRY ACTIVE</span>
</div>
</div>

<div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">

<div className="lg:col-span-8 rounded-3xl bg-white/[0.03] border border-white/10 backdrop-blur-xl p-6 sm:p-8 flex flex-col justify-between relative overflow-hidden">

<div className="relative w-full aspect-[16/9] sm:aspect-[21/10] rounded-2xl bg-[#030906] border border-white/10 overflow-hidden flex items-center justify-center p-4">
<svg className="w-full h-full" fill="none" viewBox="0 0 800 420">

<path d="M0 70 H800 M0 140 H800 M0 210 H800 M0 280 H800 M0 350 H800" stroke="#ffffff" strokeOpacity="0.04" strokeWidth="1" />
<path d="M100 0 V420 M200 0 V420 M300 0 V420 M400 0 V420 M500 0 V420 M600 0 V420 M700 0 V420" stroke="#ffffff" strokeOpacity="0.04" strokeWidth="1" />

<polygon className="cursor-pointer hover:fill-opacity-30 transition-all" fill="#22C55E" fillOpacity="0.18" points="60,60 380,40 340,360 80,380" stroke="#22C55E" strokeWidth="2" />

<polygon className="cursor-pointer hover:fill-opacity-30 transition-all" fill="#F59E0B" fillOpacity="0.18" points="390,40 740,70 710,240 350,220" stroke="#F59E0B" strokeWidth="2" />

<polygon className="cursor-pointer hover:fill-opacity-30 transition-all" fill="#38BDF8" fillOpacity="0.14" points="350,230 710,250 670,390 340,370" stroke="#38BDF8" strokeWidth="2" />

<circle cx="60" cy="60" fill="#ffffff" r="4" />
<circle cx="380" cy="40" fill="#ffffff" r="4" />
<circle cx="740" cy="70" fill="#ffffff" r="4" />
<circle cx="710" cy="240" fill="#ffffff" r="4" />
<circle cx="670" cy="390" fill="#ffffff" r="4" />
<circle cx="80" cy="380" fill="#ffffff" r="4" />

<g transform="translate(160, 180)">
<rect fill="#000000" fillOpacity="0.75" height="46" rx="8" stroke="#22C55E" strokeWidth="1" width="130"></rect>
<text fill="#ffffff" fontFamily="monospace" fontSize="12" fontWeight="bold" x="12" y="20">Plot A • 24.8 Ac</text>
<text fill="#22C55E" fontFamily="sans-serif" fontSize="10" x="12" y="36">Wheat (HD-2967)</text>
</g>
<g transform="translate(480, 120)">
<rect fill="#000000" fillOpacity="0.75" height="46" rx="8" stroke="#F59E0B" strokeWidth="1" width="130"></rect>
<text fill="#ffffff" fontFamily="monospace" fontSize="12" fontWeight="bold" x="12" y="20">Plot B • 18.2 Ac</text>
<text fill="#F59E0B" fontFamily="sans-serif" fontSize="10" x="12" y="36">Mustard (Giriraj)</text>
</g>
<g transform="translate(470, 300)">
<rect fill="#000000" fillOpacity="0.75" height="46" rx="8" stroke="#38BDF8" strokeWidth="1" width="130"></rect>
<text fill="#ffffff" fontFamily="monospace" fontSize="12" fontWeight="bold" x="12" y="20">Plot C • 11.4 Ac</text>
<text fill="#38BDF8" fontFamily="sans-serif" fontSize="10" x="12" y="36">Fallow / Cover Crop</text>
</g>
</svg>
</div>

<div className="mt-6 flex flex-wrap items-center justify-between gap-4 font-mono text-xs text-white/60">
<div className="flex items-center gap-6">
<span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-[#22C55E]"></span> Wheat (24.8 Ac)</span>
<span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-[#F59E0B]"></span> Mustard (18.2 Ac)</span>
<span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-[#38BDF8]"></span> Fallow (11.4 Ac)</span>
</div>
<span className="text-white/40">Total Verified: 54.40 Acres</span>
</div>
</div>
{/* Metric Details Panel (Lg: 4 cols) */}
<div className="lg:col-span-4 flex flex-col justify-between gap-4">
<div className="rounded-3xl bg-white/[0.03] border border-white/10 backdrop-blur-xl p-6 flex flex-col justify-between">
<div>
<span className="font-mono text-xs text-white/40 uppercase">Survey Overview</span>
<div className="mt-2 text-3xl font-extrabold text-white font-mono">{metrics.areaAcres.toFixed(2)} <span className="text-base font-normal text-white/50">Acres</span></div>
<p className="text-xs text-white/50 mt-1">Total geofenced farming holding across {metrics.count} cadastral parcel(s).</p>
</div>
<div className="mt-6 pt-4 border-t border-white/10 grid grid-cols-2 gap-4 font-mono text-xs">
<div>
<span className="text-white/40 block">PERIMETER</span>
<span className="text-white font-semibold">{metrics.perimeterMeters.toFixed(0)} Metres</span>
</div>
<div>
<span className="text-white/40 block">VERTICES</span>
<span className="text-white font-semibold">{metrics.vertices} GPS Pins</span>
</div>
</div>
</div>
<div className="rounded-3xl bg-white/[0.03] border border-white/10 backdrop-blur-xl p-6">
<span className="font-mono text-xs text-white/40 uppercase">Topography &amp; Pedology</span>
<div className="mt-3 space-y-3 font-mono text-xs">
<div className="flex items-center justify-between p-2.5 rounded-xl bg-black/40 border border-white/5">
<span className="text-white/60">Irrigation</span>
<span className="text-white font-bold">{activeFarm ? activeFarm.irrigationType : "Mixed"}</span>
</div>
<div className="flex items-center justify-between p-2.5 rounded-xl bg-black/40 border border-white/5">
<span className="text-white/60">Soil Classification</span>
<span className="text-[#22C55E] font-bold">{activeFarm ? activeFarm.soilType : "Multiple types"}</span>
</div>
<p className="text-[11px] text-white/50 mt-1">{activeFarm?.crop || "Crop"} phenology active</p>
</div>
</div>
</div>
</div>
</MotionSection>



<MotionSection className="flex flex-col space-y-10">
<div>
<div className="font-mono text-xs text-[#22C55E] uppercase tracking-wider mb-2">02 · Multispectral Radiometry</div>
<h2 id="how-it-works" className="text-3xl sm:text-4xl font-extrabold tracking-[-0.02em] text-white pt-24 -mt-24">Know what every zone needs.</h2>
<p className="mt-3 text-base text-white/60 max-w-xl">
          Multispectral radiometry converts raw light bands into actionable micro-zone prescriptions. Stop treating entire fields uniformly.
        </p>
</div>

<div className="rounded-3xl bg-white/[0.03] border border-white/10 backdrop-blur-xl p-6 sm:p-10 flex flex-col space-y-8">

<div className="flex flex-wrap items-center justify-between gap-4 pb-6 border-b border-white/10">
<div className="flex items-center gap-2 font-mono text-xs text-white/60">
<span className="material-symbols-outlined text-[16px] text-[#22C55E]">palette</span>
<span>MULTI-ZONE CANOPY DISTRIBUTION</span>
</div>

<div className="flex items-center gap-4 text-xs font-mono">
<div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-[#22C55E]"></span> <span className="text-white/80">Optimal (68%)</span></div>
<div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-[#38BDF8]"></span> <span className="text-white/80">Water Deficit (16%)</span></div>
<div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-[#F59E0B]"></span> <span className="text-white/80">Low Nitrogen (11%)</span></div>
<div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-[#EF4444]"></span> <span className="text-white/80">Anomaly (5%)</span></div>
</div>
</div>

<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
    {zones && zones.length > 0 ? zones.map((z, i) => {
      let colorClass = "text-[#22C55E]";
      let bgClass = "bg-[#22C55E]/10";
      let borderClass = "border-[#22C55E]/30";
      if (z.status.includes("Water")) { colorClass = "text-[#38BDF8]"; bgClass = "bg-[#38BDF8]/10"; borderClass = "border-[#38BDF8]/30"; }
      if (z.status.includes("Nitrogen") || z.status.includes("Nutrient")) { colorClass = "text-[#F59E0B]"; bgClass = "bg-[#F59E0B]/10"; borderClass = "border-[#F59E0B]/30"; }
      if (z.status.includes("Risk") || z.status.includes("Anomaly")) { colorClass = "text-[#EF4444]"; bgClass = "bg-[#EF4444]/10"; borderClass = "border-[#EF4444]/30"; }

      return (
        <div key={i} className={`rounded-2xl bg-black/40 border ${borderClass} p-5 flex flex-col justify-between hover:bg-black/60 transition-all`}>
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className={`inline-flex items-center gap-1.5 text-xs font-mono font-bold ${colorClass} ${bgClass} px-2.5 py-1 rounded-full border ${borderClass}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${bgClass.replace('/10', '')}`}></span>
                {z.name}
              </span>
              <span className="text-[11px] font-mono text-white/40">{z.area_pct}% Area</span>
            </div>
            <h4 className="text-base font-bold text-white">{z.status}</h4>
          </div>
          <div className="mt-5 pt-3 border-t border-white/10">
            <span className={`text-[10px] font-mono uppercase ${colorClass} tracking-wider block`}>Prescription (Rx)</span>
            <p className="text-xs font-medium text-white/90 mt-0.5">{z.prescription}</p>
          </div>
        </div>
      );
    }) : (
      <div className="text-white/50 text-sm font-mono w-full text-center col-span-4 p-8 border border-dashed border-white/20 rounded-2xl">No zones identified for this field.</div>
    )}
  </div>
  </div>
  </MotionSection>

{/* SECTION 5: LIVE HUD TELEMETRY AND SOIL DATA */}
{/* ========================================================================= */}
<section className="flex flex-col space-y-10">
<div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
<div>
<div className="font-mono text-xs text-[#22C55E] uppercase tracking-wider mb-2">03 · Mission Control Sensor Matrix</div>
<h2 className="text-3xl sm:text-4xl font-extrabold tracking-[-0.02em] text-white">Live HUD telemetry and soil data.</h2>
<p className="mt-3 text-base text-white/60 max-w-xl">
            Planetary Sentinel-2 passes synchronized with IoT ground-truth probes across 6 core edaphic dimensions.
          </p>
</div>
<div className="font-mono text-xs text-white/60 bg-white/[0.03] border border-white/10 px-4 py-2 rounded-xl flex items-center gap-2">
<span className="w-2 h-2 rounded-full bg-[#22C55E] animate-pulse"></span>
<span>OVERPASS: 18 MIN AGO • NEXT PASS: +4.2 DAYS</span>
</div>
</div>
{/* 6 Circular SVG Gauges & Metric Dials Grid */}
<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
{/* Dial 1: Soil Moisture */}
<div className="rounded-3xl bg-white/[0.03] border border-white/10 backdrop-blur-xl p-6 flex flex-col justify-between">
<div className="flex items-center justify-between">
<span className="text-xs font-mono text-white/60">SOIL MOISTURE (VWC)</span>
<span className="text-[10px] font-mono text-[#22C55E] bg-[#22C55E]/10 px-2 py-0.5 rounded">TGT: 30-36%</span>
</div>
<div className="my-6 flex items-center justify-center relative">
<svg className="w-32 h-32" viewBox="0 0 100 100">
<circle cx="50" cy="50" fill="none" r="40" stroke="#ffffff" strokeLinecap="round" strokeOpacity="0.1" strokeWidth="8"></circle>
<circle cx="50" cy="50" fill="none" r="40" stroke="#38BDF8" strokeDasharray="251.2" strokeDashoffset="85" strokeLinecap="round" strokeWidth="8" transform="rotate(-90 50 50)"></circle>
</svg>
<div className="absolute inset-0 flex flex-col items-center justify-center font-mono">
<span className="text-2xl font-bold text-white">32.4%</span>
<span className="text-[10px] text-[#38BDF8]">OPTIMAL</span>
</div>
</div>
<p className="text-xs text-white/50 text-center font-mono">Continuous capacitive sensor at 15cm</p>
</div>
{/* Dial 2: Soil Temperature */}
<div className="rounded-3xl bg-white/[0.03] border border-white/10 backdrop-blur-xl p-6 flex flex-col justify-between">
<div className="flex items-center justify-between">
<span className="text-xs font-mono text-white/60">SOIL TEMPERATURE</span>
<span className="text-[10px] font-mono text-[#22C55E] bg-[#22C55E]/10 px-2 py-0.5 rounded">NOMINAL</span>
</div>
<div className="my-6 flex items-center justify-center relative">
<svg className="w-32 h-32" viewBox="0 0 100 100">
<circle cx="50" cy="50" fill="none" r="40" stroke="#ffffff" strokeLinecap="round" strokeOpacity="0.1" strokeWidth="8"></circle>
<circle cx="50" cy="50" fill="none" r="40" stroke="#22C55E" strokeDasharray="251.2" strokeDashoffset="110" strokeLinecap="round" strokeWidth="8" transform="rotate(-90 50 50)"></circle>
</svg>
<div className="absolute inset-0 flex flex-col items-center justify-center font-mono">
<span className="text-2xl font-bold text-white">21.8°C</span>
<span className="text-[10px] text-white/50">ROOT BED</span>
</div>
</div>
<p className="text-xs text-white/50 text-center font-mono">Ideal for wheat root nutrient uptake</p>
</div>
{/* Dial 3: Soil pH */}
<div className="rounded-3xl bg-white/[0.03] border border-white/10 backdrop-blur-xl p-6 flex flex-col justify-between">
<div className="flex items-center justify-between">
<span className="text-xs font-mono text-white/60">SOIL pH LEVEL</span>
<span className="text-[10px] font-mono text-[#22C55E] bg-[#22C55E]/10 px-2 py-0.5 rounded">BALANCED</span>
</div>
<div className="my-6 flex items-center justify-center relative">
<svg className="w-32 h-32" viewBox="0 0 100 100">
<circle cx="50" cy="50" fill="none" r="40" stroke="#ffffff" strokeLinecap="round" strokeOpacity="0.1" strokeWidth="8"></circle>
<circle cx="50" cy="50" fill="none" r="40" stroke="#22C55E" strokeDasharray="251.2" strokeDashoffset="130" strokeLinecap="round" strokeWidth="8" transform="rotate(-90 50 50)"></circle>
</svg>
<div className="absolute inset-0 flex flex-col items-center justify-center font-mono">
<span className="text-2xl font-bold text-white">6.7</span>
<span className="text-[10px] text-[#22C55E]">NEUTRAL</span>
</div>
</div>
<p className="text-xs text-white/50 text-center font-mono">Range 6.2 - 7.5 provides max cation exchange</p>
</div>
{/* Dial 4: N-P-K Ratio Balance */}
<div className="rounded-3xl bg-white/[0.03] border border-white/10 backdrop-blur-xl p-6 flex flex-col justify-between">
<div className="flex items-center justify-between">
<span className="text-xs font-mono text-white/60">N-P-K RATIO BALANCE</span>
<span className="text-[10px] font-mono text-white/50">KG / HA</span>
</div>
<div className="my-6 space-y-3 font-mono text-xs">
<div>
<div className="flex justify-between mb-1 text-white/80"><span>Nitrogen (N)</span> <span>142 kg/ha</span></div>
<div className="w-full bg-white/10 h-1.5 rounded-full overflow-hidden">
<div className="bg-[#F59E0B] h-full rounded-full" style={{ width: '65%' }}></div>
</div>
</div>
<div>
<div className="flex justify-between mb-1 text-white/80"><span>Phosphorus (P)</span> <span>38 kg/ha</span></div>
<div className="w-full bg-white/10 h-1.5 rounded-full overflow-hidden">
<div className="bg-[#22C55E] h-full rounded-full" style={{ width: '78%' }}></div>
</div>
</div>
<div>
<div className="flex justify-between mb-1 text-white/80"><span>Potassium (K)</span> <span>210 kg/ha</span></div>
<div className="w-full bg-white/10 h-1.5 rounded-full overflow-hidden">
<div className="bg-[#22C55E] h-full rounded-full" style={{ width: '90%' }}></div>
</div>
</div>
</div>
<p className="text-xs text-white/50 text-center font-mono">Replenish N in Plot A (+15 kg/ha)</p>
</div>
{/* Dial 5: Organic Carbon */}
<div className="rounded-3xl bg-white/[0.03] border border-white/10 backdrop-blur-xl p-6 flex flex-col justify-between">
<div className="flex items-center justify-between">
<span className="text-xs font-mono text-white/60">ORGANIC CARBON (SOC)</span>
<span className="text-[10px] font-mono text-[#22C55E] bg-[#22C55E]/10 px-2 py-0.5 rounded">HIGH FERTILITY</span>
</div>
<div className="my-6 flex items-center justify-center relative">
<svg className="w-32 h-32" viewBox="0 0 100 100">
<circle cx="50" cy="50" fill="none" r="40" stroke="#ffffff" strokeLinecap="round" strokeOpacity="0.1" strokeWidth="8"></circle>
<circle cx="50" cy="50" fill="none" r="40" stroke="#22C55E" strokeDasharray="251.2" strokeDashoffset="100" strokeLinecap="round" strokeWidth="8" transform="rotate(-90 50 50)"></circle>
</svg>
<div className="absolute inset-0 flex flex-col items-center justify-center font-mono">
<span className="text-2xl font-bold text-white">{soilData && soilData.length > 0 ? soilData[0].organic_carbon.toFixed(2) : "--"}%</span>
<span className="text-[10px] text-white/50">TOP 20CM</span>
</div>
</div>
<p className="text-xs text-white/50 text-center font-mono">+0.06% increase via bio-mulch preservation</p>
</div>
{/* Dial 6: Salinity / EC */}
<div className="rounded-3xl bg-white/[0.03] border border-white/10 backdrop-blur-xl p-6 flex flex-col justify-between">
<div className="flex items-center justify-between">
<span className="text-xs font-mono text-white/60">SALINITY / EC</span>
<span className="text-[10px] font-mono text-[#22C55E] bg-[#22C55E]/10 px-2 py-0.5 rounded">SAFE NON-SALINE</span>
</div>
<div className="my-6 flex items-center justify-center relative">
<svg className="w-32 h-32" viewBox="0 0 100 100">
<circle cx="50" cy="50" fill="none" r="40" stroke="#ffffff" strokeLinecap="round" strokeOpacity="0.1" strokeWidth="8"></circle>
<circle cx="50" cy="50" fill="none" r="40" stroke="#38BDF8" strokeDasharray="251.2" strokeDashoffset="190" strokeLinecap="round" strokeWidth="8" transform="rotate(-90 50 50)"></circle>
</svg>
<div className="absolute inset-0 flex flex-col items-center justify-center font-mono">
<span className="text-2xl font-bold text-white">0.42</span>
<span className="text-[10px] text-white/50">dS / m</span>
</div>
</div>
<p className="text-xs text-white/50 text-center font-mono">Threshold safe limit &lt; 2.0 dS/m</p>
</div>
</div>
</section>
{/* ========================================================================= */}
{/* SECTION 6: YIELD PREDICTION & HARVEST TIMELINE */}
{/* ========================================================================= */}
<section className="flex flex-col space-y-10">
<div>
<div className="font-mono text-xs text-[#22C55E] uppercase tracking-wider mb-2">04 · Phenological Modeling</div>
<h2 className="text-3xl sm:text-4xl font-extrabold tracking-[-0.02em] text-white">Yield prediction & harvest timeline.</h2>
<p className="mt-3 text-base text-white/60 max-w-xl">
          Deep learning models calibrated with 12 years of historical multispectral baselines predict final yield output before heading.
        </p>
</div>
{/* Large Analytical Forecast Card */}
<div className="rounded-3xl bg-white/[0.03] border border-white/10 backdrop-blur-xl p-6 sm:p-10 flex flex-col space-y-10">
{/* Header Metrics Split */}
<div className="flex flex-wrap items-end justify-between gap-6">
  <div>
  <span className="font-mono text-xs text-white/50 uppercase">Predicted Field Output</span>
  <div className="mt-2 text-4xl sm:text-5xl font-extrabold text-white font-mono tracking-tight"><span id="val-yield-large">{predictions ? predictions.predicted_yield : "--"}</span> <span className="text-xl sm:text-2xl font-normal text-white/60">Quintals / Acre</span></div>
  <div className="mt-2 flex items-center gap-3 font-mono text-xs">
  <span className={`px-2 py-0.5 rounded border font-bold ${predictions?.yoy_change > 0 ? 'text-[#22C55E] bg-[#22C55E]/10 border-[#22C55E]/30' : 'text-red-400 bg-red-400/10 border-red-400/30'}`}>{predictions ? (predictions.yoy_change > 0 ? '+' : '') + predictions.yoy_change : '--'}% vs Last Season</span>
  <span className="text-white/40">Confidence: {predictions ? predictions.confidence : '--'}%</span>
  </div>
  </div>
  
  <div className="flex flex-col gap-2 font-mono text-xs text-white/60 text-right">
  <div><span className="text-white/40">Expected Harvest:</span> <span className="text-white">{predictions ? predictions.harvest_window : '--'}</span></div>
  <div><span className="text-white/40">Est. Revenue:</span> <span className="text-[#22C55E] text-sm font-bold">₹{predictions ? predictions.revenue_rs.toLocaleString() : '--'}</span></div>
  </div>
</div>
{/* SVG Area Chart with Confidence Corridor */}
<div className="w-full aspect-[21/8] min-h-[300px] rounded-2xl bg-black/40 border border-white/5 p-4 relative flex items-center">
  {predLoading ? (
      <div className="text-white/50 text-sm font-mono w-full text-center">LOADING YIELD MODEL...</div>
  ) : predictions ? (
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart key={activeFarmId} data={predictions.timeline} margin={{ top: 20, right: 20, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
            <XAxis dataKey="date" stroke="#ffffff50" fontSize={10} tickMargin={10} />
            <YAxis stroke="#ffffff50" fontSize={10} tickFormatter={(val) => `${val} Qt`} />
            <Tooltip 
                contentStyle={{ backgroundColor: '#0A120D', borderColor: '#ffffff20', borderRadius: '8px' }}
                itemStyle={{ fontSize: '12px' }}
                labelStyle={{ color: '#ffffff80', fontSize: '10px', marginBottom: '4px' }}
            />
            <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
            
            {/* Confidence Band (P10 to P90) */}
            <Area animationDuration={600} type="monotone" dataKey="p90" stroke="none" fill="#22C55E" fillOpacity={0.1} />
            <Area animationDuration={600} type="monotone" dataKey="p10" stroke="none" fill="#0A120D" fillOpacity={1} />
            
            {/* Main lines */}
            <Line animationDuration={600} type="monotone" dataKey="actual" name="Actual to Date" stroke="#22C55E" strokeWidth={3} dot={false} />
            <Line type="monotone" dataKey="forecast" name="AI Forecast" stroke="#4ADE80" strokeWidth={2} strokeDasharray="5 5" dot={false} />
            <Line type="monotone" dataKey="last_season" name="Last Season" stroke="#ffffff50" strokeWidth={1} dot={false} />
            <Line type="monotone" dataKey="district_avg" name="District Avg" stroke="#38BDF8" strokeWidth={1} dot={false} />
            
            {/* Events */}
            {predictions.events && predictions.events.map((ev, i) => (
                <ReferenceLine key={i} x={ev.date} stroke="#F59E0B" strokeDasharray="3 3" label={{ position: 'top', value: ev.type, fill: '#F59E0B', fontSize: 10 }} />
            ))}
        </ComposedChart>
      </ResponsiveContainer>
  ) : (
      <div className="text-white/50 text-sm font-mono w-full text-center">NO DATA</div>
  )}
</div>
{/* Phenological Stage Timeline */}
<div className="pt-6 border-t border-white/10">
<div className="font-mono text-xs text-white/50 uppercase mb-4">Crop Phenology Progression</div>
<div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
<div className="p-3 rounded-xl bg-white/[0.02] border border-white/5">
<span className="text-[10px] font-mono text-[#22C55E] flex items-center gap-1">
<span className="material-symbols-outlined text-[13px]">check_circle</span> COMPLETED
              </span>
<div className="text-sm font-semibold text-white mt-1">1. Germination</div>
<span className="text-xs font-mono text-white/40">Day 1 – 12</span>
</div>
<div className="p-3 rounded-xl bg-white/[0.02] border border-white/5">
<span className="text-[10px] font-mono text-[#22C55E] flex items-center gap-1">
<span className="material-symbols-outlined text-[13px]">check_circle</span> COMPLETED
              </span>
<div className="text-sm font-semibold text-white mt-1">2. Vegetative</div>
<span className="text-xs font-mono text-white/40">Day 13 – 48</span>
</div>
<div className="p-3 rounded-xl bg-[#22C55E]/10 border border-[#22C55E]/40 relative">
<span className="text-[10px] font-mono text-[#22C55E] font-bold flex items-center gap-1">
<span className="w-1.5 h-1.5 rounded-full bg-[#22C55E] animate-pulse"></span> ACTIVE (DAY 64)
              </span>
<div className="text-sm font-semibold text-white mt-1">3. Flowering</div>
<span className="text-xs font-mono text-white/60">Heading phase</span>
</div>
<div className="p-3 rounded-xl bg-white/[0.02] border border-white/5 opacity-60">
<span className="text-[10px] font-mono text-white/40">PROJECTED</span>
<div className="text-sm font-semibold text-white mt-1">4. Grain Fill</div>
<span className="text-xs font-mono text-white/40">Target: Nov 18</span>
</div>
<div className="p-3 rounded-xl bg-white/[0.02] border border-white/5 opacity-60">
<span className="text-[10px] font-mono text-white/40">HARVEST WINDOW</span>
<div className="text-sm font-semibold text-white mt-1">5. Maturity</div>
<span className="text-xs font-mono text-white/40">Nov 28 – Dec 04</span>
</div>
</div>
</div>
</div>
</section>
{/* ========================================================================= */}
{/* SECTION 7: YOUR 7-DAY ACTION PLAN */}
{/* ========================================================================= */}
<section className="flex flex-col space-y-10">
  <div>
  <div className="font-mono text-xs text-[#22C55E] uppercase tracking-wider mb-2">05 A Tactical Operations</div>
  <h2 className="text-3xl sm:text-4xl font-extrabold tracking-[-0.02em] text-white">Your 7-day action plan.</h2>
  <p className="mt-3 text-base text-white/60 max-w-xl">
            Daily micro-prescriptions derived from localized evapotranspiration, humidity, and satellite vigor readings.
  </p>
  </div>
  
  <div className="w-full bg-white/[0.03] border border-white/10 rounded-3xl p-6 sm:p-10 backdrop-blur-xl">
    <div className="flex flex-col gap-4">
      {planLoading ? (
          <div className="text-white/50 text-sm font-mono w-full text-center py-10">GENERATING ACTION PLAN...</div>
      ) : actionPlan && actionPlan.length > 0 ? (
          <>
            <div className="flex items-center justify-between mb-4">
               <div className="flex items-center gap-4">
                   <div className="w-32 h-2 bg-white/10 rounded-full overflow-hidden">
                       <div className="h-full bg-[#22C55E] transition-all" style={{width: `${(Object.keys(doneDays).length / 7) * 100}%`}}></div>
                   </div>
                   <span className="font-mono text-xs text-white/50">{Object.keys(doneDays).length} / 7 DAYS COMPLETED</span>
               </div>
               <div className="flex gap-2">
                   <button className="text-xs font-mono text-[#38BDF8] hover:text-white transition-colors bg-white/5 px-3 py-1.5 rounded-lg border border-white/10 flex items-center gap-2"><span className="material-symbols-outlined text-[14px]">share</span> Copy to WhatsApp</button>
                   <button className="text-xs font-mono text-white/60 hover:text-white transition-colors bg-white/5 px-3 py-1.5 rounded-lg border border-white/10 flex items-center gap-2"><span className="material-symbols-outlined text-[14px]">print</span> Print PDF</button>
               </div>
            </div>
            {actionPlan.map((day, idx) => (
                <div key={day.id} className={`border ${openPlanDay === idx ? 'border-[#22C55E]/40 bg-[#22C55E]/[0.02]' : 'border-white/10 bg-black/20 hover:border-white/20'} rounded-2xl transition-all overflow-hidden`}>
                    <button onClick={() => setOpenPlanDay(idx === openPlanDay ? -1 : idx)} className="w-full p-4 sm:p-5 flex items-center justify-between text-left">
                        <div className="flex items-center gap-4 sm:gap-6">
                            <div className="flex flex-col">
                                <span className="font-bold text-white text-lg">{day.day_name.toUpperCase()}</span>
                                <span className="font-mono text-xs text-white/50">{day.formatted_date.toUpperCase()}</span>
                            </div>
                            <div className="hidden sm:flex items-center gap-3 font-mono text-xs text-white/60 px-4 border-l border-white/10">
                                <span className="material-symbols-outlined text-[16px] text-[#38BDF8]">{day.weather.condition === 'Sunny' ? 'sunny' : day.weather.condition === 'Rainy' ? 'rainy' : 'cloud'}</span>
                                <span>{day.weather.temp_max}A / {day.weather.temp_min}AC</span>
                                {day.weather.rain_prob > 0 && <span className="text-[#38BDF8] ml-2">{day.weather.rain_prob}% Rain</span>}
                            </div>
                            <div className={`px-2 py-1 rounded border font-mono text-[10px] uppercase font-bold ${day.priority === 'High' ? 'text-red-400 bg-red-400/10 border-red-400/30' : day.priority === 'Medium' ? 'text-amber-400 bg-amber-400/10 border-amber-400/30' : 'text-[#22C55E] bg-[#22C55E]/10 border-[#22C55E]/30'}`}>
                                {day.priority} PRIORITY
                            </div>
                        </div>
                        <div className="flex items-center gap-4">
                            <div id={`tick-feedback-${day.id}`} className="flex items-center gap-2 font-mono text-xs text-white/50 rounded p-1 transition-all" onClick={e => e.stopPropagation()}>
                                <input type="checkbox" checked={!!doneDays[day.id]} onChange={() => { toggleTask(day.id); document.getElementById(`tick-feedback-${day.id}`).classList.add('motion-tick-feedback'); setTimeout(() => document.getElementById(`tick-feedback-${day.id}`)?.classList.remove('motion-tick-feedback'), 400); }} className="w-4 h-4 rounded bg-black/50 border-white/20 accent-[#22C55E] cursor-pointer" />
                                <span className="hidden sm:inline">MARK DONE</span>
                            </div>
                            <span className={`material-symbols-outlined text-white/50 transition-transform ${openPlanDay === idx ? 'rotate-180' : ''}`}>expand_more</span>
                        </div>
                    </button>
                    
                    <Collapse isOpen={openPlanDay === idx}>
                        <div className="p-4 sm:p-6 sm:pt-2 border-t border-white/10 flex flex-col gap-6 animate-in fade-in slide-in-from-top-2 duration-300">
                            
                            <p className="text-sm text-white/70 italic border-l-2 border-white/20 pl-3">"{day.priority_reason}"</p>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="flex flex-col gap-4">
                                    <h4 className="font-mono text-xs text-[#22C55E] tracking-wider font-bold">TIME-BLOCKED TASKS</h4>
                                    <div className="flex flex-col gap-3">
                                        {day.tasks.map((task, tIdx) => (
                                            <div key={tIdx} className="bg-black/30 rounded-xl p-4 border border-white/5 relative">
                                                <div className="absolute top-0 right-0 px-2 py-1 bg-white/5 rounded-bl-xl rounded-tr-xl font-mono text-[10px] text-white/40">₹{task.cost}</div>
                                                <div className="flex items-start gap-3">
                                                    <div className="w-16 shrink-0 font-mono text-xs text-[#38BDF8] pt-1">{task.time}</div>
                                                    <div className="flex flex-col gap-1">
                                                        <span className="font-bold text-white text-sm">{task.what}</span>
                                                        <span className="text-xs text-white/60">{task.why}</span>
                                                        <div className="flex flex-wrap gap-2 mt-2">
                                                            <span className="px-1.5 py-0.5 rounded bg-white/5 font-mono text-[9px] text-white/50">{task.quantity}</span>
                                                            <span className="px-1.5 py-0.5 rounded bg-white/5 font-mono text-[9px] text-white/50">{task.duration}</span>
                                                            <span className="px-1.5 py-0.5 rounded bg-white/5 font-mono text-[9px] text-white/50">{task.equipment}</span>
                                                        </div>
                                                        <span className="text-[10px] font-mono text-white/40 mt-1">TRIGGER: {task.trigger}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                    
                                    {day.scouting && day.scouting.length > 0 && (
                                        <div className="mt-2 bg-[#F59E0B]/10 rounded-xl p-4 border border-[#F59E0B]/20">
                                            <h4 className="font-mono text-xs text-[#F59E0B] tracking-wider font-bold mb-2 flex items-center gap-2"><span className="material-symbols-outlined text-[14px]">search</span> SCOUTING CHECKLIST</h4>
                                            <ul className="list-disc pl-4 text-xs text-white/80 space-y-1">
                                                {day.scouting.map((s, i) => <li key={i}>{s}</li>)}
                                            </ul>
                                        </div>
                                    )}
                                </div>
                                
                                <div className="flex flex-col gap-4">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="bg-[#22C55E]/10 rounded-xl p-4 border border-[#22C55E]/20">
                                            <h4 className="font-mono text-[10px] text-[#22C55E] tracking-wider font-bold mb-2">DO</h4>
                                            <ul className="flex flex-col gap-2">
                                                {day.do_list.map((d, i) => (
                                                    <li key={i} className="text-xs text-white/90">
                                                        <span className="block font-bold">{d.text}</span>
                                                        <span className="block text-[10px] text-white/50">{d.reason}</span>
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                        <div className="bg-[#EF4444]/10 rounded-xl p-4 border border-[#EF4444]/20">
                                            <h4 className="font-mono text-[10px] text-[#EF4444] tracking-wider font-bold mb-2">DON'T</h4>
                                            <ul className="flex flex-col gap-2">
                                                {day.dont_list.map((d, i) => (
                                                    <li key={i} className="text-xs text-white/90">
                                                        <span className="block font-bold">{d.text}</span>
                                                        <span className="block text-[10px] text-white/50">{d.reason}</span>
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    </div>
                                    
                                    {(day.irrigation || day.spray) && (
                                        <div className="flex flex-col gap-3 mt-2">
                                            {day.irrigation && (
                                                <div className="bg-[#38BDF8]/10 rounded-xl p-3 border border-[#38BDF8]/20 flex justify-between items-center">
                                                    <div className="flex flex-col">
                                                        <span className="font-mono text-[10px] text-[#38BDF8] font-bold">IRRIGATION SPECS</span>
                                                        <span className="text-xs text-white/90">{day.irrigation.mm}mm ({day.irrigation.litres_acre.toLocaleString()} L/Acre)</span>
                                                    </div>
                                                    <span className="font-mono text-xs text-white/70">{day.irrigation.best_hour}</span>
                                                </div>
                                            )}
                                            {day.spray && (
                                                <div className="bg-[#A855F7]/10 rounded-xl p-3 border border-[#A855F7]/20 flex justify-between items-center">
                                                    <div className="flex flex-col">
                                                        <span className="font-mono text-[10px] text-[#A855F7] font-bold">SPRAY RECIPE</span>
                                                        <span className="text-xs text-white/90">{day.spray.product} • {day.spray.dose} • {day.spray.water}</span>
                                                        <span className="text-[10px] text-white/50 mt-1">Nozzle: {day.spray.nozzle} | Re-entry: {day.spray.re_entry}</span>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                    
                                    {day.risk_alerts && day.risk_alerts.length > 0 && (
                                        <div className="mt-auto pt-4 border-t border-white/10 flex flex-col gap-2">
                                            {day.risk_alerts.map((alert, idx) => (
                                                <div key={idx} className="flex items-start gap-2 text-xs text-red-400">
                                                    <span className="material-symbols-outlined text-[14px]">warning</span>
                                                    <span>{alert}</span>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                    
                                    <div className="mt-auto flex items-center justify-between font-mono text-xs pt-4 border-t border-white/10">
                                        <div className="flex items-center gap-2 text-white/60">
                                            <span className="material-symbols-outlined text-[14px]">flag</span>
                                            {day.expected_outcome}
                                        </div>
                                        <div className="text-white">EST. COST: <span className="font-bold text-[#22C55E]">₹{day.daily_cost}</span></div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </Collapse>
                </div>
            ))}
          </>
      ) : (
          <div className="text-white/50 text-sm font-mono w-full text-center py-10">NO PLAN DATA</div>
      )}
    </div>
  </div>
      {/* 7-DAY FIELD REPORT (Added per user request) */}
      <div className="mt-8 rounded-3xl bg-white/[0.03] border border-white/10 backdrop-blur-xl p-6 sm:p-8 flex flex-col space-y-6 print:bg-white print:text-black print:border-gray-300 print:shadow-none print:m-0 print:p-8 print:block">
          <div className="flex justify-between items-start print:items-center border-b border-white/10 print:border-gray-300 pb-4">
              <div>
                  <h3 className="text-2xl font-bold text-white print:text-black">{activeFarm?.name || 'Field'} - 7-Day Field Report</h3>
                  <div className="flex gap-4 mt-2 font-mono text-xs text-white/60 print:text-gray-600">
                      <span>CROP: {activeFarm?.crop_type || 'Unknown'}</span>
                      <span>STAGE: Vegetative <span className="text-[#38BDF8] ml-1">[Demo]</span></span>
                      <span>AREA: {(activeFarm?.area_hectares * 2.47105).toFixed(1)} Acres</span>
                      <span>DATE: {new Date().toLocaleDateString()} - {new Date(Date.now() + 6 * 86400000).toLocaleDateString()}</span>
                  </div>
              </div>
              <button onClick={() => window.print()} className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors font-mono text-xs text-white/80 print:hidden flex items-center gap-2">
                  <span className="material-symbols-outlined text-[16px]">download</span>
                  Download Report
              </button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 print:grid-cols-2">
              <div className="flex flex-col gap-2">
                  <h4 className="font-mono text-xs text-[#38BDF8] print:text-[#1F8A4D] font-bold">WEATHER OUTLOOK</h4>
                  <ul className="text-sm text-white/80 print:text-black space-y-1">
                      <li>Total Rainfall: {weather ? weather.reduce((sum, w) => sum + w.precipitation, 0).toFixed(1) : 0} mm</li>
                      <li>Peak Wind: {activeWeather?.wind_gusts || 12} km/h</li>
                      <li>Total ET0: {weather ? (weather.length * 3.2).toFixed(1) : 22.4} mm <span className="text-white/40 print:text-gray-400 text-[10px]">[Modelled]</span></li>
                  </ul>
              </div>
              <div className="flex flex-col gap-2">
                  <h4 className="font-mono text-xs text-[#38BDF8] print:text-[#1F8A4D] font-bold">WATER BALANCE</h4>
                  <ul className="text-sm text-white/80 print:text-black space-y-1">
                      <li>Recommended Irrigation: {satData ? satData.waterDeficit.toFixed(0) : 0} mm</li>
                      <li>Volume: {satData ? (satData.waterDeficit * 4000).toLocaleString() : 0} L/Acre</li>
                      <li>Action Days: {actionPlan && actionPlan.some(d => d.irrigation) ? actionPlan.filter(d => d.irrigation).map(d => d.day_name.substring(0,3)).join(', ') : 'None'}</li>
                  </ul>
              </div>
              <div className="flex flex-col gap-2">
                  <h4 className="font-mono text-xs text-[#A855F7] print:text-[#1F8A4D] font-bold">NUTRIENT & SPRAY SCHEDULE</h4>
                  <ul className="text-sm text-white/80 print:text-black space-y-1">
                      {actionPlan && actionPlan.filter(d => d.spray).length > 0 ? actionPlan.filter(d => d.spray).map((d, i) => (
                          <li key={i}>{d.day_name}: {d.spray.product} @ {d.spray.dose}</li>
                      )) : <li>No sprays planned.</li>}
                  </ul>
              </div>
              <div className="flex flex-col gap-2">
                  <h4 className="font-mono text-xs text-[#22C55E] print:text-[#1F8A4D] font-bold">TASK PROGRESS</h4>
                  <p className="text-sm text-white/80 print:text-black">{Object.keys(doneDays).length} out of 7 daily core tasks completed.</p>
              </div>
          </div>
          
          <div className="flex flex-col gap-2 pt-4 border-t border-white/10 print:border-gray-300">
              <h4 className="font-mono text-xs text-white/50 print:text-gray-500 font-bold">RISK CALENDAR</h4>
              <div className="flex gap-2 w-full overflow-x-auto">
                  {actionPlan && actionPlan.map((d, i) => (
                      <div key={i} className="flex-1 min-w-[60px] text-center p-2 rounded-lg bg-black/20 print:bg-gray-100 border border-white/5 print:border-gray-200">
                          <span className="block text-[10px] font-mono text-white/50 print:text-gray-500">{d.day_name.substring(0,3)}</span>
                          <span className={`block w-2 h-2 rounded-full mx-auto mt-1 ${d.risk_alerts.length > 0 ? 'bg-amber-400' : 'bg-[#22C55E]'}`}></span>
                      </div>
                  ))}
              </div>
          </div>
          
          <div className="flex flex-col gap-2 pt-4 border-t border-white/10 print:border-gray-300">
              <h4 className="font-mono text-xs text-[#22C55E] print:text-[#1F8A4D] font-bold">YIELD TRAJECTORY <span className="text-white/40 print:text-gray-400 text-[10px] ml-1">[Model Forecast]</span></h4>
              <p className="text-sm text-white/80 print:text-black">
                  Expected {activeFarm?.crop_type || 'Crop'} yield: {activeFarm?.crop_type === 'Cotton' ? '12.4' : activeFarm?.crop_type === 'Mustard' ? '8.5' : '26.2'} Qtl/Acre. 
                  Conditions this week are supporting optimal vegetative expansion.
              </p>
          </div>
      </div>

  </section>
{/* ========================================================================= */}
{/* SECTION 8: ADVANCED MICRO-WEATHER */}
{/* ========================================================================= */}
<section className="flex flex-col space-y-10">
<div>
<div className="font-mono text-xs text-[#22C55E] uppercase tracking-wider mb-2">06 · Atmospheric Dynamics</div>
<h2 className="text-3xl sm:text-4xl font-extrabold tracking-[-0.02em] text-white">Advanced micro-weather.</h2>
<p className="mt-3 text-base text-white/60 max-w-xl">
          Hyperlocal 2km atmospheric resolution calibrated for precision agronomy, drift control, and evapotranspiration.
        </p>
</div>
<div className="rounded-3xl bg-white/[0.03] border border-white/10 backdrop-blur-xl p-6 sm:p-8 flex flex-col space-y-8">
{/* 10-Day Strip Container */}
<div className="overflow-x-auto pb-2">
  <div className="flex items-stretch gap-3 min-w-[980px]">
  {weather && weather.map((w, idx) => {
      const actualToday = new Date().toISOString().split("T")[0];
        const isActualToday = w.date === actualToday;
        const isPast = new Date(w.date) < new Date(actualToday);
        const dayLabel = isActualToday ? "Today" : isPast ? "Observed" : "Forecast";
        const isToday = w.date === activeWeatherDate;
      return (
        <div key={idx} 
             onClick={() => { setActiveWeatherDate(w.date); setActiveWeather(w); }}
             className={`flex-1 p-3.5 rounded-xl text-center font-mono cursor-pointer transition-all ${isToday ? 'bg-[#22C55E]/10 border-2 border-[#22C55E] shadow-[0_0_20px_rgba(34,197,94,0.2)]' : isPast ? 'bg-white/[0.01] border border-white/5 opacity-40 hover:opacity-100' : 'bg-white/[0.02] border border-white/10 hover:border-white/30'}`}>
          <span className={`text-[10px] block ${isToday ? 'text-[#22C55E] font-bold' : isPast ? 'text-white/50' : 'text-white/60'}`}>{w.dayOfWeek.toUpperCase()} <span className="opacity-50 text-[8px] block">{dayLabel}</span></span>
          <span className={`material-symbols-outlined my-2 ${isToday ? 'text-amber-400 text-[22px]' : w.precipitation > 0 ? 'text-[#38BDF8] text-[20px]' : 'text-amber-300 text-[20px]'}`}>{w.precipitation > 0 ? 'rainy' : 'sunny'}</span>
          <div className={`${isToday ? 'text-sm text-white font-extrabold' : 'text-xs text-white/80 font-bold'}`}>{Math.round(w.max_temp)}° / {Math.round(w.min_temp)}°</div>
          <span className={`text-[10px] block mt-1 ${isToday ? 'text-[#38BDF8]' : 'text-white/50'}`}>{w.precipitation.toFixed(1)}mm rain</span>
        </div>
      );
  })}
  </div>
  </div>
  </div>
  {/* Lower Analytics Sub-Grid */}
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pt-6 border-t border-white/10">
  {/* Best Spray Window Card */}
  <div className="p-5 rounded-2xl bg-black/40 border border-[#22C55E]/30 flex flex-col justify-between">
  <div>
  <span className="font-mono text-xs text-[#22C55E] uppercase tracking-wider flex items-center gap-1.5 font-bold">
  <span className="material-symbols-outlined text-[16px]">check_circle</span>
                  BEST SPRAY WINDOW
                </span>
  <div className="mt-3 text-lg font-bold text-white">
      {activeWeather && activeWeather.precipitation === 0 ? "06:00 AM - 09:30 AM" : "No safe spray window"}
  </div>
  <p className="text-xs text-white/60 mt-2">
      {activeWeather && activeWeather.precipitation === 0 
          ? "Optimal drift conditions: Surface wind < 7 km/h, Relative humidity 54%, Inversion dissipating, zero precipitation risk." 
          : "Precipitation risk detected. Spraying not recommended to prevent runoff and chemical drift."}
  </p>
  </div>
  <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between text-xs font-mono">
  <span className="text-white/40">DRIFT RISK</span>
  <span className={activeWeather && activeWeather.precipitation === 0 ? "text-[#22C55E] font-bold" : "text-[#EF4444] font-bold"}>
      {activeWeather && activeWeather.precipitation === 0 ? "MINIMAL (LEVEL 1)" : "HIGH (LEVEL 4)"}
  </span>
  </div>
  </div>
  {/* 7-Day Rainfall Forecast Bar Graph */}
  <div className="p-5 rounded-2xl bg-black/40 border border-white/10 flex flex-col justify-between">
  <div className="flex items-center justify-between">
  <span className="font-mono text-xs text-white/50 uppercase">Precipitation Accumulation</span>
  <span className="font-mono text-xs text-[#38BDF8]">
      {weather ? weather.reduce((acc, w) => acc + w.precipitation, 0).toFixed(1) : "0.0"} mm Total
  </span>
  </div>
  {/* Bar Chart SVG */}
  <div className="my-4 flex items-end justify-between gap-2 h-20 px-2 font-mono text-[10px] text-white/40">
  {weather && weather.map((w, i) => {
      const maxPrecip = Math.max(...weather.map(x => x.precipitation), 0.1);
      const heightPct = Math.max((w.precipitation / maxPrecip) * 100, 2);
      const isActive = w.date === activeWeatherDate;
      return (
        <div key={i} className="flex flex-col items-center gap-1 flex-1">
          <div style={{ height: `${heightPct}%` }} className={`w-full rounded-t transition-all ${isActive ? 'bg-[#38BDF8] shadow-[0_0_10px_rgba(56,189,248,0.5)]' : 'bg-[#38BDF8]/20'}`}></div>
          <span className={isActive ? "text-[#38BDF8] font-bold" : ""}>{w.dayOfWeek.charAt(0)}</span>
        </div>
      );
  })}
  </div>
  <p className="text-[11px] text-white/50">
      {weather && weather.every(w => w.precipitation === 0) ? "No rain is expected in the current 10-day window." : "Precipitation events recorded across the forecast window."}
  </p>
  </div>
  {/* Alert Safety Status */}
  <div className="p-5 rounded-2xl bg-black/40 border border-white/10 flex flex-col justify-between">
  <div>
  <span className="font-mono text-xs text-white/50 uppercase">Extreme Weather Guard</span>
  <div className="mt-3 flex items-center gap-2">
  <span className={`w-3 h-3 rounded-full ${activeWeather && (activeWeather.max_temp > 35 || activeWeather.min_temp < 5) ? 'bg-[#EF4444]' : 'bg-[#22C55E]'}`}></span>
  <span className="text-base font-bold text-white">
      {activeWeather && (activeWeather.max_temp > 35 || activeWeather.min_temp < 5) ? "Thermal Stress Alert" : "No severe weather alerts"}
  </span>
  </div>
  <p className="text-xs text-white/60 mt-2">
      {activeWeather && activeWeather.max_temp > 35 ? "Heat stress risk detected. Peak temperatures exceed nominal photosynthetic bounds." : activeWeather && activeWeather.min_temp < 5 ? "Frost risk detected. Minimum temperatures approach freezing thresholds." : "Zero frost risk, hailstorm probability < 2%, and diurnal temperature curve stays within nominal bounds."}
  </p>
  </div>
  <div className="mt-4 pt-3 border-t border-white/10 font-mono text-[11px] text-white/40 flex items-center justify-between">
  <span>SCAN RADIUS: 25 KM</span>
  <span className={activeWeather && (activeWeather.max_temp > 35 || activeWeather.min_temp < 5) ? "text-[#EF4444]" : "text-[#22C55E]"}>
      {activeWeather && (activeWeather.max_temp > 35 || activeWeather.min_temp < 5) ? "ALERT ACTIVE" : "CLEAR 120 HRS"}
  </span>
  </div>
  </div>
  </div>
    </section>
  {/* ========================================================================= */}
{/* SECTION 9: MORE INSIGHTS (BENTO GRID OF 6 TILES) */}
{/* ========================================================================= */}
<section className="flex flex-col space-y-10">
<div>
<div className="font-mono text-xs text-[#22C55E] uppercase tracking-wider mb-2">07 · Agronomic Intelligence</div>
<h2 className="text-3xl sm:text-4xl font-extrabold tracking-[-0.02em] text-white">More insights.</h2>
<p className="mt-3 text-base text-white/60 max-w-xl">
          Complete holistic telemetry covering disease pathogen modeling, commodity economics, and soil carbon balances.
        </p>
</div>
{/* Bento Grid (6 Tiles) */}
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
{/* Tile 1: Field Health Score */}
<div className="rounded-3xl bg-white/[0.03] border border-white/10 backdrop-blur-xl p-6 flex flex-col justify-between">
<div>
<div className="flex items-center justify-between">
<span className="font-mono text-xs text-white/50 uppercase">Canopy Uniformity</span>
<span className="text-xs font-mono text-[#22C55E]">Top 5% Region</span>
</div>
<div className="mt-4 flex items-baseline gap-2">
<span className="text-4xl font-extrabold text-white font-mono">{satData && satData.length > 0 ? (satData[0].ndvi_avg * 100).toFixed(0) : "--"}</span>
<span className="text-white/40 font-mono text-sm">/ 100</span>
</div>
<p className="text-xs text-white/60 mt-2">
              Composite index combining leaf chlorophyll, biomass thickness, and thermal transpiration equilibrium.
            </p>
</div>
<div className="mt-6 pt-4 border-t border-white/10 flex items-center gap-2 font-mono text-xs text-[#22C55E]">
<span className="material-symbols-outlined text-[16px]">verified</span>
<span>EXCELLENT UNIFORMITY</span>
</div>
</div>
{/* Tile 2: Evapotranspiration & Irrigation Need */}
<div className="rounded-3xl bg-white/[0.03] border border-white/10 backdrop-blur-xl p-6 flex flex-col justify-between">
<div>
<div className="flex items-center justify-between">
<span className="font-mono text-xs text-[#38BDF8] uppercase">Penman-Monteith ETc</span>
<span className="text-xs font-mono text-white/40">Model V4.1</span>
</div>
<div className="mt-4 text-3xl font-extrabold text-white font-mono">{soilData && soilData.length > 0 ? (100 - soilData[0].moisture).toFixed(0) : "--"} mm <span className="text-sm font-normal text-white/50">Net Deficit</span></div>
<p className="text-xs text-white/60 mt-2">
              Apply 18mm net water this week across Plot A & B to prevent stomatal conductance throttling.
            </p>
</div>
<div className="mt-6 pt-4 border-t border-white/10 flex items-center justify-between font-mono text-xs">
<span className="text-white/40">PUMP RUNTIME</span>
<span className="text-white font-bold">4.2 Hours Total</span>
</div>
</div>
{/* Tile 3: Pest & Disease Risk */}
<div className="rounded-3xl bg-white/[0.03] border border-white/10 backdrop-blur-xl p-6 flex flex-col justify-between">
<div>
<div className="flex items-center justify-between">
<span className="font-mono text-xs text-white/50 uppercase">Pathogen Risk</span>
<span className={`text-xs font-mono px-2 py-0.5 rounded ${(activeWeather && activeWeather.precipitation > 5) ? "text-amber-400 bg-amber-400/10" : "text-[#22C55E] bg-[#22C55E]/10"}`}>{(activeWeather && activeWeather.precipitation > 5) ? "MODERATE" : "LOW"}</span>
</div>
<div className="mt-4 text-xl font-bold text-white">Blight & Rust Forecast Safe</div>
<p className="text-xs text-white/60 mt-2">
              Microclimate spore humidity threshold clear. Canopy aeration remains favorable throughout the upcoming 10 days.
            </p>
</div>
<div className="mt-6 pt-4 border-t border-white/10 flex items-center justify-between font-mono text-xs text-white/50">
<span>SPORE INDEX: 0.14</span>
<span className={`${(activeWeather && activeWeather.precipitation > 5) ? "text-amber-400" : "text-[#22C55E]"}`}>{(activeWeather && activeWeather.precipitation > 5) ? "MONITOR" : "NOMINAL"}</span>
</div>
</div>
{/* Tile 4: Wind & Spray Window */}
<div className="rounded-3xl bg-white/[0.03] border border-white/10 backdrop-blur-xl p-6 flex flex-col justify-between">
<div>
<div className="flex items-center justify-between">
<span className="font-mono text-xs text-white/50 uppercase">Anemometer Live</span>
<span className="text-xs font-mono text-[#38BDF8]">Gusts: 9 km/h</span>
</div>
<div className="mt-4 text-3xl font-extrabold text-white font-mono">
              6.2 <span className="text-sm font-normal text-white/50">km/h NW</span>
</div>
<p className="text-xs text-white/60 mt-2">
              Gentle breeze. Ideal droplet trajectory without aerodynamic shear or canopy bounce losses.
            </p>
</div>
<div className="mt-6 pt-4 border-t border-white/10 flex items-center justify-between font-mono text-xs">
<span className="text-white/40">NOZZLE TYPE</span>
<span className="text-white font-bold">Air-Induction 0.3</span>
</div>
</div>
{/* Tile 5: Market Intelligence & Commodity Prices */}
<div className="rounded-3xl bg-white/[0.03] border border-white/10 backdrop-blur-xl p-6 flex flex-col justify-between">
<div>
<div className="flex items-center justify-between">
<span className="font-mono text-xs text-[#22C55E] uppercase">Mandi Market Telemetry</span>
<span className="text-xs font-mono text-[#22C55E]">+3.2% 7d</span>
</div>
<div className="mt-4 text-2xl font-extrabold text-white font-mono">
              ₹2,840 <span className="text-sm font-normal text-white/50">/ Quintal</span>
</div>
<p className="text-xs text-white/60 mt-2">
              {activeFarm?.crop_type || "Crop"} grade A spot price at regional terminal hub. Projected price upside indicates a 14-day hold post-harvest.
            </p>
</div>
<div className="mt-6 pt-4 border-t border-white/10 flex items-center justify-between font-mono text-xs">
<span className="text-white/40">ACTION</span>
<span className="text-[#22C55E] font-bold">HOLD STORAGE • SELL DEC</span>
</div>
</div>
{/* Tile 6: Multi-Year Rotation & Soil Carbon */}
<div className="rounded-3xl bg-white/[0.03] border border-white/10 backdrop-blur-xl p-6 flex flex-col justify-between">
<div>
<div className="flex items-center justify-between">
<span className="font-mono text-xs text-white/50 uppercase">Crop Rotation Ledger</span>
<span className="text-xs font-mono text-white/40">4 Seasons</span>
</div>
<div className="mt-4 text-xl font-bold text-white">Wheat → Moong → Mustard</div>
<p className="text-xs text-white/60 mt-2">
              Leguminous green-manure cycle preserved 420 kg of atmospheric nitrogen and sequestered +0.08% organic carbon.
            </p>
</div>
<div className="mt-6 pt-4 border-t border-white/10 flex items-center justify-between font-mono text-xs text-white/50">
<span>CARBON OFFSET</span>
<span className="text-[#22C55E] font-bold">+{soilData && soilData.length > 0 ? (soilData[0].organic_carbon * 2.1).toFixed(2) : "--"} T CO2e/ha</span>
</div>
</div>
</div>

  <div>
  <div className="font-mono text-xs text-[#22C55E] uppercase tracking-wider mb-2">07 A Data Science</div>
  <h2 className="text-3xl sm:text-4xl font-extrabold tracking-[-0.02em] text-white">More insights.</h2>
  </div>
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
  {/* Tile 1: Field Health Score */}
  <div className="rounded-3xl bg-white/[0.03] border border-white/10 backdrop-blur-xl p-6 flex flex-col justify-between">
  <div>
  <div className="flex items-center justify-between">
  <span className="font-mono text-xs text-white/50 uppercase">Canopy Uniformity</span>
  <span className="text-xs font-mono text-[#22C55E]">Top 5% Region</span>
  </div>
  <div className="mt-4 flex items-baseline gap-2">
  <span className="text-4xl font-extrabold text-white font-mono">{satData ? (satData.ndvi * 100).toFixed(0) : "No data"}</span>
  <span className="text-white/40 font-mono text-sm">/ 100</span>
  </div>
  <p className="text-xs text-white/60 mt-2">
                Composite index combining leaf chlorophyll, biomass thickness, and thermal transpiration equilibrium.
              </p>
  </div>
  <div className="mt-6 pt-4 border-t border-white/10 flex items-center gap-2 font-mono text-xs text-[#22C55E]">
  <span className="material-symbols-outlined text-[16px]">verified</span>
  <span>EXCELLENT UNIFORMITY</span>
  </div>
  </div>
  {/* Tile 2: Evapotranspiration & Irrigation Need */}
  <div className="rounded-3xl bg-white/[0.03] border border-white/10 backdrop-blur-xl p-6 flex flex-col justify-between">
  <div>
  <div className="flex items-center justify-between">
  <span className="font-mono text-xs text-[#38BDF8] uppercase">Penman-Monteith ETc</span>
  <span className="text-xs font-mono text-white/40">Model V4.1</span>
  </div>
  <div className="mt-4 text-3xl font-extrabold text-white font-mono">{satData ? satData.waterDeficit.toFixed(0) : "No data"} mm <span className="text-sm font-normal text-white/50">Net Deficit</span></div>
  <p className="text-xs text-white/60 mt-2">
                Apply {satData ? satData.waterDeficit.toFixed(0) : "0"}mm net water this week to prevent stomatal conductance throttling.
              </p>
  </div>
  <div className="mt-6 pt-4 border-t border-white/10 flex items-center justify-between font-mono text-xs">
  <span className="text-white/40">PUMP RUNTIME</span>
  <span className="text-white font-bold">{satData ? satData.pumpRuntime.toFixed(1) : "0"} Hours Total</span>
  </div>
  </div>
  {/* Tile 3: Pest & Disease Risk */}
  <div className="rounded-3xl bg-white/[0.03] border border-white/10 backdrop-blur-xl p-6 flex flex-col justify-between">
  <div>
  <div className="flex items-center justify-between">
  <span className="font-mono text-xs text-white/50 uppercase">Pathogen Risk</span>
  <span className={`text-xs font-mono px-2 py-0.5 rounded ${(activeWeather && activeWeather.precipitation > 5) ? "text-amber-400 bg-amber-400/10" : "text-[#22C55E] bg-[#22C55E]/10"}`}>{(activeWeather && activeWeather.precipitation > 5) ? "MODERATE" : "LOW"}</span>
  </div>
  <div className="mt-4 text-xl font-bold text-white">Blight & Rust Forecast Safe</div>
  <p className="text-xs text-white/60 mt-2">
                Microclimate spore humidity threshold clear. Canopy aeration remains favorable throughout the upcoming 10 days.
              </p>
  </div>
  <div className="mt-6 pt-4 border-t border-white/10 flex items-center justify-between font-mono text-xs text-white/50">
  <span>SPORE INDEX: 0.14</span>
  <span className={`${(activeWeather && activeWeather.precipitation > 5) ? "text-amber-400" : "text-[#22C55E]"}`}>{(activeWeather && activeWeather.precipitation > 5) ? "MONITOR" : "NOMINAL"}</span>
  </div>
  </div>
  {/* Tile 4: Wind & Spray Window */}
  <div className="rounded-3xl bg-white/[0.03] border border-white/10 backdrop-blur-xl p-6 flex flex-col justify-between">
  <div>
  <div className="flex items-center justify-between">
  <span className="font-mono text-xs text-white/50 uppercase">Anemometer Live</span>
  <span className="text-xs font-mono text-[#38BDF8]">Gusts: {activeWeather ? activeWeather.wind_gusts : "No data"} km/h</span>
  </div>
  <div className="mt-4 text-3xl font-extrabold text-white font-mono">
                {activeWeather ? activeWeather.wind_speed : "No data"} <span className="text-sm font-normal text-white/50">km/h {activeWeather ? activeWeather.wind_direction : ""}°</span>
  </div>
  <p className="text-xs text-white/60 mt-2">
                {activeWeather && activeWeather.wind_speed < 12 ? "Gentle breeze. Ideal droplet trajectory without aerodynamic shear or canopy bounce losses." : "High wind speeds detected. Delay spraying to prevent significant chemical drift and canopy loss."}
              </p>
  </div>
  <div className="mt-6 pt-4 border-t border-white/10 flex items-center justify-between font-mono text-xs">
  <span className="text-white/40">NOZZLE TYPE</span>
  <span className="text-white font-bold">Air-Induction 0.3</span>
  </div>
  </div>
  {/* Tile 5: Market Intelligence & Commodity Prices */}
  <div className="rounded-3xl bg-white/[0.03] border border-white/10 backdrop-blur-xl p-6 flex flex-col justify-between">
  <div>
  <div className="flex items-center justify-between">
  <span className="font-mono text-xs text-[#22C55E] uppercase">Mandi Market Telemetry</span>
  <span className="text-xs font-mono text-[#22C55E]">+3.2% 7d</span>
  </div>
  <div className="mt-4 text-2xl font-extrabold text-white font-mono">
                ₹{satData ? satData.mandiPrice.toLocaleString() : (activeFarm?.crop_type === "Cotton" ? "7,000" : activeFarm?.crop_type === "Mustard" ? "5,500" : "2,200")} <span className="text-sm font-normal text-white/50">/ Quintal</span>
  </div>
  <p className="text-xs text-white/60 mt-2">
                {activeFarm?.crop_type || "Crop"} grade A spot price at regional terminal hub. Projected price upside indicates a 14-day hold post-harvest. <span className="text-[#38BDF8] ml-1">[Demo]</span>
              </p>
  </div>
  <div className="mt-6 pt-4 border-t border-white/10 flex items-center justify-between font-mono text-xs">
  <span className="text-white/40">ACTION</span>
  <span className="text-[#22C55E] font-bold">HOLD STORAGE ➔ SELL DEC</span>
  </div>
  </div>
  {/* Tile 6: Multi-Year Rotation & Soil Carbon */}
  <div className="rounded-3xl bg-white/[0.03] border border-white/10 backdrop-blur-xl p-6 flex flex-col justify-between">
  <div>
  <div className="flex items-center justify-between">
  <span className="font-mono text-xs text-white/50 uppercase">Crop Rotation Ledger</span>
  <span className="text-xs font-mono text-white/40">4 Seasons</span>
  </div>
  <div className="mt-4 text-xl font-bold text-white">{activeFarm?.crop_type === "Cotton" ? "Cotton ➔ Wheat ➔ Cotton" : activeFarm?.crop_type === "Mustard" ? "Mustard ➔ Millet ➔ Mustard" : "Wheat ➔ Moong ➔ Paddy"} <span className="text-[#38BDF8] ml-1 text-sm">[Demo]</span></div>
  <p className="text-xs text-white/60 mt-2">
                Leguminous green-manure cycle preserved 420 kg of atmospheric nitrogen and sequestered +0.08% organic carbon.
              </p>
  </div>
  <div className="mt-6 pt-4 border-t border-white/10 flex items-center justify-between font-mono text-xs text-white/50">
  <span>CARBON OFFSET</span>
  <span className="text-[#22C55E] font-bold">+{satData ? satData.carbonOffset.toFixed(2) : "No data"} T CO2e/ha <span className="text-white/50 font-normal ml-1">[Modelled]</span></span>
  </div>
  </div>
  </div>
  </section>
{/* ========================================================================= */}
{/* SECTION 10: FINAL CALL TO ACTION SHOWCASE */}
{/* ========================================================================= */}
<section className="relative rounded-3xl bg-white/[0.02] border border-white/10 p-8 sm:p-16 lg:p-20 overflow-hidden text-center flex flex-col items-center" id="console">
{/* Center Glowing Orbit Graphic Ring Background */}
<div className="pointer-events-none absolute inset-0 flex items-center justify-center">
<div className="w-[600px] h-[600px] rounded-full border border-[#22C55E]/15 opacity-50"></div>
<div className="w-[420px] h-[420px] rounded-full border border-[#38BDF8]/20 animate-pulse"></div>
<div className="w-[240px] h-[240px] rounded-full bg-[#1F8A4D]/10 blur-3xl"></div>
</div>
{/* Content */}
<div className="relative z-10 max-w-2xl flex flex-col items-center">
{/* Official Emblem Logo Reference */}
<div className="w-16 h-16 rounded-2xl bg-white/[0.05] border border-white/15 p-2 backdrop-blur-xl flex items-center justify-center mb-6 shadow-[0_0_30px_rgba(31,138,77,0.3)]">
<img alt="TerraOrbit Emblem" className="w-full h-full object-contain" src="https://lh3.googleusercontent.com/aida-public/AB6AXuAl7A0QtAsr8iqNJopiyvW0Imry6PZM7U4YEzNS1jgAXNdbF-P7T0djn5w0KDEaPTrnwwFGid9RBW3gSVw7gT1AXWyXG0Q7WyaKJGrtD-uxo72SCY4VYnMxFKGRUysJTCKMR3bivzxF7vhHGSTcxr96mdV3hrfkmo9n_GcgGrL3asKZuPJHe7W09hjFhsG9WY9eobCuonS8bWLtDl5AMG0XC9IWsWRKCa4bQv0HU-IZ_jI6S-s31pIuRrLgE7c604afhRI"/>
</div>
<h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-white leading-tight">
          Start monitoring your first field.
        </h2>
<p className="mt-4 text-base sm:text-lg text-white/60 leading-relaxed">
          Zero hardware installation required. Simply input your parcel boundaries or survey number to receive live multispectral telemetry within 90 seconds.
        </p>
<div className="mt-8 flex flex-wrap items-center justify-center gap-4">
<button className="px-8 py-4 rounded-full bg-[#1F8A4D] hover:bg-[#18703e] text-white text-sm font-semibold tracking-wide shadow-[0_0_35px_rgba(31,138,77,0.5)] transition-all" type="button">
            Get Started Now
          </button>
<button className="px-8 py-4 rounded-full bg-white/[0.05] hover:bg-white/[0.1] border border-white/15 text-white/90 text-sm font-medium tracking-wide transition-all" type="button">
            Talk to an agronomist
          </button>
</div>
<div className="mt-8 flex items-center gap-6 font-mono text-xs text-white/40">
<span>✓ 14-day free trial</span>
<span>•</span>
<span>✓ No credit card required</span>
<span>•</span>
<span>✓ Sub-10cm resolution</span>
</div>
</div>
</section>
  
<section id="features" className="py-20 flex flex-col items-center justify-center">
    {/* Stubs for scrolling */}
</section>

<section id="how-it-works" className="w-full max-w-6xl mx-auto px-6 py-20 flex flex-col space-y-10">
    <div>
        <div className="font-mono text-xs text-[#22C55E] uppercase tracking-wider mb-2">How It Works</div>
        <h2 className="text-3xl sm:text-4xl font-extrabold text-white">4 Steps to Precision Agriculture</h2>
    </div>
    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white/5 p-6 rounded-2xl border border-white/10">
            <span className="text-4xl font-black text-white/20 mb-4 block">1</span>
            <h3 className="text-xl font-bold text-white mb-2">Connect Field</h3>
            <p className="text-white/60 text-sm">We pull exact bounds for {activeFarm?.name || "your field"}.</p>
        </div>
        <div className="bg-white/5 p-6 rounded-2xl border border-white/10">
            <span className="text-4xl font-black text-white/20 mb-4 block">2</span>
            <h3 className="text-xl font-bold text-white mb-2">Analyze Health</h3>
            <p className="text-white/60 text-sm">Multi-spectral satellite data computes real-time vigor.</p>
        </div>
        <div className="bg-white/5 p-6 rounded-2xl border border-white/10">
            <span className="text-4xl font-black text-white/20 mb-4 block">3</span>
            <h3 className="text-xl font-bold text-white mb-2">Micro-Weather</h3>
            <p className="text-white/60 text-sm">Hyper-local forecasting models specific to your coordinates.</p>
        </div>
        <div className="bg-white/5 p-6 rounded-2xl border border-white/10">
            <span className="text-4xl font-black text-white/20 mb-4 block">4</span>
            <h3 className="text-xl font-bold text-white mb-2">Action Plan</h3>
            <p className="text-white/60 text-sm">AI generates daily tasks to optimize {activeFarm?.crop_type || "yield"}.</p>
        </div>
    </div>
</section>

  <MotionSection id="weather">
      {/* Existing weather section is inside the console block, we just scroll there */}
  </MotionSection>

  <MotionSection id="insights" className="w-full max-w-6xl mx-auto px-6 py-20 flex flex-col space-y-10">
      <div>
          <div className="font-mono text-xs text-[#22C55E] uppercase tracking-wider mb-2">Portfolio Analytics</div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white">Cross-Field Insights & Comparison</h2>
      </div>
      
      <div className="overflow-x-auto w-full">
          <table className="w-full text-left text-sm text-white/80 whitespace-nowrap">
              <thead className="text-xs uppercase bg-white/5 text-white/50">
                  <tr>
                      <th className="px-6 py-4 rounded-tl-xl font-mono">Field Name</th>
                      <th className="px-6 py-4 font-mono">Crop</th>
                      <th className="px-6 py-4 font-mono text-right">Area (Acres)</th>
                      <th className="px-6 py-4 font-mono text-right">Est. Yield (Qtl)</th>
                      <th className="px-6 py-4 font-mono text-right">Water Need</th>
                      <th className="px-6 py-4 font-mono">Health</th>
                      <th className="px-6 py-4 rounded-tr-xl font-mono text-right">Est. Revenue (Rs)</th>
                  </tr>
              </thead>
              <tbody>
                  {compareData ? compareData.map((row, idx) => (
                      <tr key={idx} className="border-b border-white/10 bg-black/20 hover:bg-white/5 transition-colors">
                          <td className="px-6 py-4 font-bold text-white">{row.name}</td>
                          <td className="px-6 py-4">{row.crop}</td>
                          <td className="px-6 py-4 text-right font-mono">{row.area}</td>
                          <td className="px-6 py-4 text-right font-mono font-bold text-[#38BDF8]">{row.yield}</td>
                          <td className="px-6 py-4 text-right font-mono">{row.water} mm</td>
                          <td className="px-6 py-4"><span className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${row.health === 'Excellent' ? 'bg-[#22C55E]/20 text-[#22C55E]' : 'bg-[#F59E0B]/20 text-[#F59E0B]'}`}>{row.health}</span></td>
                          <td className="px-6 py-4 text-right font-mono font-bold text-[#22C55E]">₹{row.revenue.toLocaleString()}</td>
                      </tr>
                  )) : (
                      <tr><td colSpan="7" className="px-6 py-8 text-center text-white/50 font-mono">LOADING DATA...</td></tr>
                  )}
              </tbody>
          </table>
      </div>
  </MotionSection>

  <AnimatePresence>{showTour && (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} transition={{ ease: motionTokens.easing.entrance }} className="bg-[#0A120D] border border-white/20 p-8 rounded-3xl max-w-2xl w-full shadow-2xl relative">
              <button onClick={() => setShowTour(false)} className="absolute top-6 right-6 text-white/50 hover:text-white">
                  <span className="material-symbols-outlined">close</span>
              </button>
              <h2 className="text-2xl font-bold text-white mb-4">Guided Auto-Tour</h2>
              
              <div className="h-40 flex items-center justify-center border border-white/10 rounded-xl bg-black/40 mb-6">
                  <p className="text-[#22C55E] font-mono text-center px-8">
                      {tourStep === 0 && "> Initializing Map View... Analyzing Field 1 Boundaries."}
                      {tourStep === 1 && "> Processing Open-Meteo micro-weather data for active coordinates."}
                      {tourStep === 2 && "> Generating AI prescriptions for the 7-Day Action Plan."}
                      {tourStep === 3 && "> Calculating 16-week yield trajectory vs historical baseline."}
                      {tourStep === 4 && "> Tour complete! You can now explore the dashboard manually."}
                  </p>
              </div>
              
              <div className="flex justify-between items-center">
                  <div className="flex gap-2">
                      {[0,1,2,3,4].map(s => (
                          <div key={s} className={`w-2 h-2 rounded-full ${s === tourStep ? 'bg-[#22C55E]' : 'bg-white/20'}`}></div>
                      ))}
                  </div>
                  <div className="flex gap-4">
                      {tourStep < 4 ? (
                          <button onClick={() => setTourStep(s => s + 1)} className="px-6 py-2 bg-[#22C55E] text-white rounded-full font-bold hover:bg-[#16a34a] transition-colors">Next Step</button>
                      ) : (
                          <button onClick={() => setShowTour(false)} className="px-6 py-2 bg-[#22C55E] text-white rounded-full font-bold hover:bg-[#16a34a] transition-colors">Finish</button>
                      )}
                  </div>
              </div>
          </motion.div>
      </motion.div>
  )}</AnimatePresence>
  </div>
    </div>
  </main>
<footer className="w-full bg-[#050B08] text-white/60 border-t border-white/10 py-10"><div className="w-full max-w-[1440px] mx-auto px-6 lg:px-12 flex flex-col md:flex-row items-center justify-between gap-6"><div className="flex items-center gap-4"><img src="terra-orbit-logo.png" width="32" height="32" alt="" className="w-[32px] h-[32px] rounded-full object-cover shrink-0 shadow-[0_0_15px_rgba(34,197,94,0.25)]" /><span className="text-xl font-bold tracking-tight text-white">Terra<span className="text-[#22C55E]">Orbit</span></span><span className="text-sm text-white/40 ml-4">&copy; 2026 TerraOrbit Technologies Inc. All orbital telemetry reserved.</span></div><div className="flex flex-wrap items-center gap-6 text-sm text-white/50"><a className="hover:text-white transition-colors" href="#">Terms</a><a className="hover:text-white transition-colors" href="#">Privacy</a><a className="hover:text-white transition-colors" href="#">Satellites</a><a className="hover:text-white transition-colors" href="#">Security</a><button className="flex items-center gap-1 text-white/80 hover:text-white transition-colors text-sm border border-white/20 rounded px-3 py-1"><span>Global (EN)</span><span className="material-symbols-outlined text-[12px]">unfold_more</span></button></div></div></footer>



        </div>
    );
}
    