import React, { useMemo, useState, useRef, useEffect } from "react";
import { Globe, DollarSign, TrendingUp, Info } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import worldCountries from "../../assets/data/world_countries.json";
import regionsUSA from "../../assets/data/regions_USA.json";
import regionsARG from "../../assets/data/regions_ARG.json";
import regionsBRA from "../../assets/data/regions_BRA.json";
import regionsESP from "../../assets/data/regions_ESP.json";

interface CountrySales {
  countryId: string; // ISO Alpha-3 (e.g. "USA", "ARG", "ESP")
  salesVolume: number;
  totalRevenue: number;
}

interface RegionSales {
  regionId: string; // Combined country and region code (e.g. "US-CA", "AR-B", "ES-MD")
  regionName?: string;
  salesVolume: number;
  totalRevenue: number;
}

interface GlobalSalesMapProps {
  salesData?: CountrySales[];
  regionSalesData?: RegionSales[];
  currency?: string;
}

// Low-resolution default country sales data as fallback
const DEFAULT_SALES_DATA: CountrySales[] = [
  { countryId: "USA", salesVolume: 1540, totalRevenue: 135400 },
  { countryId: "ARG", salesVolume: 1210, totalRevenue: 84200 },
  { countryId: "ESP", salesVolume: 820, totalRevenue: 62500 },
  { countryId: "BRA", salesVolume: 610, totalRevenue: 41800 },
  { countryId: "MEX", salesVolume: 580, totalRevenue: 38200 },
  { countryId: "CAN", salesVolume: 520, totalRevenue: 45600 },
  { countryId: "GBR", salesVolume: 490, totalRevenue: 39500 },
  { countryId: "DEU", salesVolume: 470, totalRevenue: 36200 },
  { countryId: "FRA", salesVolume: 410, totalRevenue: 31400 },
  { countryId: "COL", salesVolume: 340, totalRevenue: 18600 },
  { countryId: "CHL", salesVolume: 290, totalRevenue: 16500 },
  { countryId: "JPN", salesVolume: 250, totalRevenue: 24800 },
  { countryId: "AUS", salesVolume: 210, totalRevenue: 19500 },
  { countryId: "IND", salesVolume: 180, totalRevenue: 11200 },
];

// Detailed regional data matching each country's subregions JSON files
const DEFAULT_REGION_SALES_DATA: RegionSales[] = [
  // USA (Total: 1540)
  { regionId: "US-CA", salesVolume: 620, totalRevenue: 54500 },
  { regionId: "US-TX", salesVolume: 410, totalRevenue: 36000 },
  { regionId: "US-NY", salesVolume: 280, totalRevenue: 24600 },
  { regionId: "US-FL", salesVolume: 150, totalRevenue: 13200 },
  { regionId: "US-IL", salesVolume: 60, totalRevenue: 5100 },
  { regionId: "US-WA", salesVolume: 20, totalRevenue: 2000 },

  // Argentina (Total: 1210)
  { regionId: "AR-B", salesVolume: 580, totalRevenue: 40300 },
  { regionId: "AR-X", salesVolume: 320, totalRevenue: 22200 },
  { regionId: "AR-S", salesVolume: 190, totalRevenue: 13250 },
  { regionId: "AR-M", salesVolume: 90, totalRevenue: 6200 },
  { regionId: "AR-T", salesVolume: 20, totalRevenue: 1400 },
  { regionId: "AR-U", salesVolume: 5, totalRevenue: 525 }, // Chubut
  { regionId: "AR-Z", salesVolume: 5, totalRevenue: 525 }, // Santa Cruz

  // España (Total: 820)
  { regionId: "ES-MD", salesVolume: 350, totalRevenue: 26600 },
  { regionId: "ES-CT", salesVolume: 270, totalRevenue: 20500 },
  { regionId: "ES-AN", salesVolume: 140, totalRevenue: 10600 },
  { regionId: "ES-VC", salesVolume: 60, totalRevenue: 4800 },

  // Brasil (Total: 610)
  { regionId: "BR-SP", salesVolume: 380, totalRevenue: 26000 },
  { regionId: "BR-RJ", salesVolume: 180, totalRevenue: 12300 },
  { regionId: "BR-MG", salesVolume: 50, totalRevenue: 3500 },
];

const COUNTRY_NAME_MAP: Record<string, string> = {
  USA: "Estados Unidos",
  ARG: "Argentina",
  ESP: "España",
  BRA: "Brasil",
  MEX: "México",
  CAN: "Canadá",
  GBR: "Reino Unido",
  DEU: "Alemania",
  FRA: "Francia",
  COL: "Colombia",
  CHL: "Chile",
  JPN: "Japón",
  AUS: "Australia",
  IND: "India",
};

const DRILLDOWN_SUPPORTED_COUNTRIES = ["USA", "ARG", "BRA", "ESP"];

export const GlobalSalesMap: React.FC<GlobalSalesMapProps> = ({
  salesData = DEFAULT_SALES_DATA,
  regionSalesData = DEFAULT_REGION_SALES_DATA,
  currency = "USD",
}) => {
  const [selectedCountry, setSelectedCountry] = useState<string | null>(null);
  const [hoveredElement, setHoveredElement] = useState<any | null>(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
  const [mapZoom, setMapZoom] = useState(1);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const activeCountries = salesData.filter((s) => s.salesVolume > 0);
    if (activeCountries.length === 1) {
      const countryId = activeCountries[0].countryId.toUpperCase();
      if (DRILLDOWN_SUPPORTED_COUNTRIES.includes(countryId)) {
        setSelectedCountry(countryId);
        setMapZoom(2);
      }
    }
  }, [salesData]);

  // Index country sales data by countryId for fast O(1) checks
  const salesMap = useMemo(() => {
    const map = new Map<string, CountrySales>();
    salesData.forEach((item) => {
      map.set(item.countryId.toUpperCase(), item);
    });
    return map;
  }, [salesData]);

  // Helper to normalize strings for comparison
  const normalize = (val?: string) => {
    if (!val) return "";
    return val
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "") // remove accents
      .replace(/[^a-z0-9]/g, "");
  };

  // Index region sales by regionId AND normalized name for fast O(1) checks
  const regionSalesMap = useMemo(() => {
    const map = new Map<string, RegionSales>();
    regionSalesData.forEach((item) => {
      map.set(item.regionId.toUpperCase(), item);
      if (item.regionName) {
        map.set(normalize(item.regionName), item);
      }
    });
    return map;
  }, [regionSalesData]);

  // Find max country sales volume for global color scales
  const maxSalesVolume = useMemo(() => {
    if (salesData.length === 0) return 1;
    return Math.max(...salesData.map((item) => item.salesVolume), 1);
  }, [salesData]);

  // Find max regional sales volume for country color scales
  const maxRegionSalesVolume = useMemo(() => {
    if (regionSalesData.length === 0) return 1;
    return Math.max(...regionSalesData.map((item) => item.salesVolume), 1);
  }, [regionSalesData]);

  // Find max regional revenue for heat map intensity
  const maxRegionRevenue = useMemo(() => {
    if (regionSalesData.length === 0) return 1;
    return Math.max(...regionSalesData.map((item) => item.totalRevenue), 1);
  }, [regionSalesData]);

  // Global map geometry: Miller Cylindrical representation
  const projectGlobal = useMemo(() => {
    const width = 1010;
    const height = 660;

    return (lng: number, lat: number) => {
      const x = ((lng + 180) * width) / 360;
      const latClamped = Math.max(-60, Math.min(82, lat));
      const latRad = (latClamped * Math.PI) / 180;
      const y =
        height / 2 -
        1.25 *
          (width / (2 * Math.PI)) *
          Math.log(Math.tan(Math.PI / 4 + 0.4 * latRad));
      return `${x.toFixed(1)},${(y + 35).toFixed(1)}`;
    };
  }, []);

  // Compute global SVG paths from worldCountries
  const globalPaths = useMemo(() => {
    return worldCountries.features.map((feature: any) => {
      const geometry = feature.geometry;
      if (!geometry) return { ...feature, pathData: "" };

      const { type, coordinates } = geometry;
      let pathData = "";

      if (type === "Polygon") {
        pathData = coordinates
          .map((ring: any[]) => {
            const points = ring.map((coord) =>
              projectGlobal(coord[0], coord[1]),
            );
            return `M${points.join("L")}Z`;
          })
          .join(" ");
      } else if (type === "MultiPolygon") {
        pathData = coordinates
          .map((polygon: any[][]) => {
            return polygon
              .map((ring: any[]) => {
                const points = ring.map((coord) =>
                  projectGlobal(coord[0], coord[1]),
                );
                return `M${points.join("L")}Z`;
              })
              .join(" ");
          })
          .join(" ");
      }

      return {
        ...feature,
        pathData,
      };
    });
  }, [projectGlobal]);

  // Dynamic automatic projection builder for active countries
  const countryPaths = useMemo(() => {
    if (!selectedCountry) return [];

    let features: any[] = [];
    if (selectedCountry === "USA") features = regionsUSA.features;
    else if (selectedCountry === "ARG") {
      features = [...regionsARG.features];
      // Inject CABA geometry if missing, to plot it on the heatmap
      if (!features.some((f) => f.id === "AR-C" || f.properties?.name === "Ciudad Autónoma de Buenos Aires")) {
        features.push({
          id: "AR-C",
          properties: { name: "Ciudad Autónoma de Buenos Aires" },
          geometry: {
            type: "Polygon",
            coordinates: [
              [
                [-58.38, -34.60],
                [-58.40, -34.60],
                [-58.40, -34.62],
                [-58.38, -34.62],
                [-58.38, -34.60],
              ],
            ],
          },
        });
      }
    } else if (selectedCountry === "BRA") features = regionsBRA.features;
    else if (selectedCountry === "ESP") features = regionsESP.features;

    if (!features || features.length === 0) return [];

    // Extract all lat/lng points to compute bounds
    const rawPoints: [number, number][] = [];
    features.forEach((feat: any) => {
      const geom = feat.geometry;
      if (!geom) return;
      const { type, coordinates } = geom;
      if (type === "Polygon") {
        coordinates.forEach((ring: any[]) => {
          ring.forEach((coord: number[]) => {
            rawPoints.push([coord[0], coord[1]]);
          });
        });
      } else if (type === "MultiPolygon") {
        coordinates.forEach((poly: any[][]) => {
          poly.forEach((ring: any[]) => {
            ring.forEach((coord: number[]) => {
              rawPoints.push([coord[0], coord[1]]);
            });
          });
        });
      }
    });

    if (rawPoints.length === 0) return [];

    // Transform points to Mercator Projection coordinates
    const mercator = (lng: number, lat: number) => {
      const x = (lng + 180) * (1000 / 360);
      const latRad = (lat * Math.PI) / 180;
      const y =
        600 -
        (1000 / (2 * Math.PI)) * Math.log(Math.tan(Math.PI / 4 + latRad / 2));
      return [x, y];
    };

    let minProjX = Infinity,
      maxProjX = -Infinity;
    let minProjY = Infinity,
      maxProjY = -Infinity;

    rawPoints.forEach(([lng, lat]) => {
      const [px, py] = mercator(lng, lat);
      if (px < minProjX) minProjX = px;
      if (px > maxProjX) maxProjX = px;
      if (py < minProjY) minProjY = py;
      if (py > maxProjY) maxProjY = py;
    });

    // Output dimension sizing with elegant boundary padding (comfortably centered)
    const width = 1000;
    const height = 550;
    const pad = 40;

    const mapWidth = width - 2 * pad;
    const mapHeight = height - 2 * pad;

    const projWidth = maxProjX - minProjX || 1;
    const projHeight = maxProjY - minProjY || 1;

    // Maintain geographical aspect ratio safely
    const scale = Math.min(mapWidth / projWidth, mapHeight / projHeight);

    // Compute absolute translation shifts
    const xOffset = pad + (mapWidth - projWidth * scale) / 2 - minProjX * scale;
    const yOffset =
      pad + (mapHeight - projHeight * scale) / 2 - minProjY * scale;

    const localProject = (lng: number, lat: number) => {
      const [px, py] = mercator(lng, lat);
      const fx = px * scale + xOffset;
      const fy = py * scale + yOffset;
      return `${fx.toFixed(1)},${fy.toFixed(1)}`;
    };

    // Compile dynamic SVG path data
    return features.map((feature: any) => {
      const geometry = feature.geometry;
      if (!geometry) return { ...feature, pathData: "" };

      const { type, coordinates } = geometry;
      let pathData = "";

      let allPointsX = 0;
      let allPointsY = 0;
      let pointsCount = 0;

      if (type === "Polygon") {
        pathData = coordinates
          .map((ring: any[]) => {
            const points = ring.map((coord) => {
              const proj = localProject(coord[0], coord[1]);
              const pt = proj.split(",");
              allPointsX += parseFloat(pt[0]);
              allPointsY += parseFloat(pt[1]);
              pointsCount++;
              return proj;
            });
            return `M${points.join("L")}Z`;
          })
          .join(" ");
      } else if (type === "MultiPolygon") {
        pathData = coordinates
          .map((polygon: any[][]) => {
            return polygon
              .map((ring: any[]) => {
                const points = ring.map((coord) => {
                  const proj = localProject(coord[0], coord[1]);
                  const pt = proj.split(",");
                  allPointsX += parseFloat(pt[0]);
                  allPointsY += parseFloat(pt[1]);
                  pointsCount++;
                  return proj;
                });
                return `M${points.join("L")}Z`;
              })
              .join(" ");
          })
          .join(" ");
      }

      return {
        ...feature,
        pathData,
        centroidX: pointsCount > 0 ? allPointsX / pointsCount : null,
        centroidY: pointsCount > 0 ? allPointsY / pointsCount : null,
      };
    });
  }, [selectedCountry]);

  // Color generator for global countries matching thermographic scale
  const getGlobalFeatureColor = (feature: any) => {
    const id = feature.id ? feature.id.toUpperCase() : "";
    const sale = salesMap.get(id);
    if (!sale || sale.salesVolume === 0) {
      return "#1b233a"; // Classic high contrast dark background
    }
    const intensity = Math.max(0.15, sale.salesVolume / maxSalesVolume);

    // Warm Amber to Coral/Red transition
    const startColor = { r: 245, g: 158, b: 11 }; // Amber-500
    const endColor = { r: 239, g: 68, b: 68 }; // Red-500

    const r = Math.round(
      startColor.r + (endColor.r - startColor.r) * intensity,
    );
    const g = Math.round(
      startColor.g + (endColor.g - startColor.g) * intensity,
    );
    const b = Math.round(
      startColor.b + (endColor.b - startColor.b) * intensity,
    );

    return `rgb(${r}, ${g}, ${b})`;
  };

  // Helper to find region sales from a feature safely
  const getRegionSale = (feature: any) => {
    let id = feature.id ? feature.id.toUpperCase() : "";
    // Special handling for Malvinas to group with Tierra del Fuego (AR-V)
    if (
      id.startsWith("AR-V-MALVINAS") ||
      feature.properties?.name === "Islas Malvinas"
    ) {
      id = "AR-V";
    }

    let sale = regionSalesMap.get(id);
    if (!sale && feature.properties?.name) {
      sale = regionSalesMap.get(normalize(feature.properties.name));
    }
    return sale;
  };

  // Color generator for interval states or communities
  const getRegionFeatureColor = (feature: any) => {
    return "#1b4a85"; // Deep map blue to match the user's reference base map
  };

  const formatValue = (val: number) => {
    return new Intl.NumberFormat("es-AR", {
      style: "currency",
      currency: currency,
      maximumFractionDigits: 0,
    }).format(val);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    setTooltipPos({
      x: e.clientX - rect.left + 15,
      y: e.clientY - rect.top + 15,
    });
  };

  // Conssolidated dynamic metrics
  const summary = useMemo(() => {
    const totalSales = salesData.reduce(
      (acc, curr) => acc + curr.salesVolume,
      0,
    );
    const totalRev = salesData.reduce(
      (acc, curr) => acc + curr.totalRevenue,
      0,
    );

    // Count active custom regions with conversion
    const activeRegionsCount = regionSalesData.filter(
      (r) => r.salesVolume > 0,
    ).length;
    // Count active countries with conversions which do not use subregions
    const activeOtherCountriesCount = salesData.filter(
      (s) =>
        s.salesVolume > 0 &&
        !DRILLDOWN_SUPPORTED_COUNTRIES.includes(s.countryId.toUpperCase()),
    ).length;

    return {
      totalSales,
      totalRev,
      zonesCount: activeRegionsCount + activeOtherCountriesCount,
    };
  }, [salesData, regionSalesData]);

  const listData = useMemo(() => {
    if (selectedCountry) {
      return regionSalesData
        .filter(
          (r) => r.salesVolume > 0 && r.regionId.startsWith(selectedCountry),
        )
        .sort((a, b) => b.totalRevenue - a.totalRevenue)
        .map((r) => ({
          id: r.regionId,
          name: r.regionName,
          salesVolume: r.salesVolume,
          totalRevenue: r.totalRevenue,
        }));
    } else {
      return salesData
        .filter((s) => s.salesVolume > 0)
        .sort((a, b) => b.totalRevenue - a.totalRevenue)
        .map((s) => ({
          id: s.countryId,
          name: COUNTRY_NAME_MAP[s.countryId.toUpperCase()] || s.countryId,
          salesVolume: s.salesVolume,
          totalRevenue: s.totalRevenue,
        }));
    }
  }, [selectedCountry, salesData, regionSalesData]);

  return (
    <div
      id="global-sales-map-root"
      className="bg-white border border-slate-200 rounded-[2rem] p-8 shadow-sm flex flex-col gap-6 select-none relative animate-in fade-in duration-500"
    >
      {/* HEADER SECTION */}
      <div className="mb-2">
        <p className="text-sm text-slate-500 font-medium leading-relaxed">
          Mapa de calor interactivo que refleja el volumen de ventas y
          facturación por zonas geográficas.
        </p>
      </div>

      {/* CONTENT SECTION */}
      <div className="flex flex-col lg:flex-row gap-6 items-stretch">
        {/* INTERACTIVE SVG MAP CONTAINER */}
        <div
          ref={containerRef}
          onMouseMove={handleMouseMove}
          onMouseLeave={() => setHoveredElement(null)}
          className="relative bg-[#070b13] rounded-2xl border border-slate-950 p-2 overflow-hidden flex items-center justify-center w-full lg:w-[60%] shadow-inner min-h-[420px] lg:min-h-0"
        >
          {/* ZOOM CONTROLS */}
          <div className="absolute top-4 right-4 z-40 flex flex-col gap-1">
            <button
              onClick={() => setMapZoom((prev) => Math.min(prev + 0.25, 3))}
              className="w-7 h-7 bg-slate-900/60 hover:bg-slate-800 text-white rounded flex items-center justify-center border border-slate-700/50 backdrop-blur-md transition-colors"
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="12" y1="5" x2="12" y2="19"></line>
                <line x1="5" y1="12" x2="19" y2="12"></line>
              </svg>
            </button>
            <button
              onClick={() => setMapZoom((prev) => Math.max(prev - 0.25, 0.5))}
              className="w-7 h-7 bg-slate-900/60 hover:bg-slate-800 text-white rounded flex items-center justify-center border border-slate-700/50 backdrop-blur-md transition-colors"
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="5" y1="12" x2="19" y2="12"></line>
              </svg>
            </button>
            <button
              onClick={() => setMapZoom(1)}
              className="w-7 h-7 bg-slate-900/60 hover:bg-slate-800 text-slate-300 rounded flex items-center justify-center border border-slate-700/50 backdrop-blur-md transition-colors text-[8px] font-black mt-1"
            >
              1x
            </button>
          </div>

          {/* RETORNO FLOATING BUTTON */}
          <AnimatePresence>
            {selectedCountry && (
              <motion.button
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                onClick={() => {
                  setSelectedCountry(null);
                  setHoveredElement(null);
                  setMapZoom(1);
                }}
                className="absolute top-4 left-4 z-40 flex items-center gap-2 px-4 py-2 bg-slate-900 border border-slate-700/60 hover:bg-slate-800 text-white text-[10px] sm:text-xs font-black uppercase rounded-xl shadow-lg transition-all active:scale-95 text-center"
              >
                ← Volver al mapa global
              </motion.button>
            )}
          </AnimatePresence>

          {/* MAP CONTENT WITH ZOOM */}
          <div
            style={{
              transform: `scale(${mapZoom})`,
              transition: "transform 300ms cubic-bezier(0.2, 0, 0, 1)",
            }}
            className="w-full h-full flex items-center justify-center p-4"
          >
            {/* CONDITIONALLY RENDER GLOBES / DETAILS */}
            {!selectedCountry ? (
              /* GLOBE BASE LAYER */
              <svg
                viewBox="0 0 1010 660"
                className="w-full h-auto max-h-[500px]"
                xmlns="http://www.w3.org/2000/svg"
              >
                <rect width="1010" height="660" fill="transparent" />
                <g id="world-map-countries">
                  {globalPaths.map((feature: any) => {
                    if (!feature.pathData) return null;

                    const id = feature.id ? feature.id.toUpperCase() : "";
                    const isHovered = hoveredElement?.id === feature.id;

                    const sale = salesMap.get(id);
                    const hasSales = sale && sale.salesVolume > 0;
                    const canDrillDown =
                      DRILLDOWN_SUPPORTED_COUNTRIES.includes(id);

                    return (
                      <path
                        key={feature.id}
                        d={feature.pathData}
                        fill={getGlobalFeatureColor(feature)}
                        stroke={isHovered ? "#ffffff" : "#070b13"}
                        strokeWidth={isHovered ? "1.5" : "0.4"}
                        style={{
                          cursor:
                            hasSales || canDrillDown ? "pointer" : "default",
                          transition:
                            "fill 250ms ease, stroke 150ms ease, stroke-width 150ms ease",
                        }}
                        className={`transition-all ${hasSales ? "hover:brightness-110 hover:opacity-100" : "opacity-[0.82] hover:opacity-95"}`}
                        onClick={() => {
                          if (canDrillDown) {
                            setSelectedCountry(id);
                            setHoveredElement(null);
                            setMapZoom(2);
                          }
                        }}
                        onMouseEnter={() => {
                          const cName =
                            COUNTRY_NAME_MAP[id] || feature.properties.name;
                          setHoveredElement({
                            id: feature.id,
                            name: cName,
                            type: "country",
                            salesVolume: sale ? sale.salesVolume : 0,
                            totalRevenue: sale ? sale.totalRevenue : 0,
                            active: hasSales,
                            canDrillDown,
                          });
                        }}
                      />
                    );
                  })}
                </g>
              </svg>
            ) : (
              /* DETAILED COUNTRY SUBDIVISIONS LAYER */
              <svg
                viewBox="0 0 1000 550"
                className="w-full h-auto max-h-[500px] animate-in fade-in duration-300 zoom-in-95"
                xmlns="http://www.w3.org/2000/svg"
              >
                <defs>
                  <filter id="metaball">
                    <feGaussianBlur
                      in="SourceGraphic"
                      stdDeviation="2"
                      result="blur"
                    />
                    <feColorMatrix
                      in="blur"
                      mode="matrix"
                      values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 18 -5"
                      result="goo"
                    />
                  </filter>
                  <radialGradient id="heatGradient" cx="50%" cy="50%" r="50%">
                    <stop offset="0%" stopColor="rgba(255, 0, 0, 1)" />
                    <stop offset="25%" stopColor="rgba(255, 0, 0, 1)" />
                    <stop offset="30%" stopColor="rgba(255, 130, 0, 1)" />
                    <stop offset="50%" stopColor="rgba(255, 130, 0, 1)" />
                    <stop offset="55%" stopColor="rgba(250, 220, 0, 1)" />
                    <stop offset="75%" stopColor="rgba(250, 220, 0, 1)" />
                    <stop offset="80%" stopColor="rgba(0, 240, 50, 0.95)" />
                    <stop offset="95%" stopColor="rgba(0, 240, 50, 0.95)" />
                    <stop offset="100%" stopColor="rgba(0, 50, 255, 0)" />
                  </radialGradient>
                </defs>
                <rect width="1000" height="550" fill="transparent" />
                <g id="country-subregions-fill">
                  {countryPaths.map((feature: any) => {
                    if (!feature.pathData) return null;

                    const isHovered = hoveredElement?.id === feature.id;

                    return (
                      <path
                        key={`fill-${feature.id}`}
                        d={feature.pathData}
                        fill={getRegionFeatureColor(feature)}
                        stroke="none"
                        style={{
                          transition: "fill 150ms ease",
                        }}
                        className="opacity-95 transition-all"
                      />
                    );
                  })}
                </g>
                <g
                  id="country-subregions-heat"
                  style={{ mixBlendMode: "screen", filter: "url(#metaball)" }}
                >
                  {countryPaths.map((feature: any) => {
                    if (!feature.centroidX || !feature.centroidY) return null;
                    const sale = getRegionSale(feature);
                    if (!sale || sale.salesVolume === 0) return null;

                    // Scale heat radius based on total revenue relative to the max regional revenue
                    const intensity = Math.min(
                      1,
                      sale.totalRevenue / maxRegionRevenue,
                    );
                    // Cap the maximum radius to avoid visual clutter from large outliers
                    const radius = Math.min(
                      24,
                      8 + 16 * Math.pow(intensity, 0.45),
                    );

                    return (
                      <circle
                        key={`heat-${feature.id}`}
                        cx={feature.centroidX}
                        cy={feature.centroidY}
                        r={radius}
                        fill="url(#heatGradient)"
                        style={{ pointerEvents: "none" }} // Don't block hover on paths
                      />
                    );
                  })}
                </g>
                <g id="country-subregions-stroke">
                  {countryPaths.map((feature: any) => {
                    if (!feature.pathData) return null;

                    const isHovered = hoveredElement?.id === feature.id;
                    const sale = getRegionSale(feature);
                    const hasSales = sale && sale.salesVolume > 0;

                    return (
                      <path
                        key={`stroke-${feature.id}`}
                        d={feature.pathData}
                        fill="transparent"
                        stroke={
                          isHovered ? "#ffffff" : "rgba(255, 255, 255, 0.3)"
                        }
                        strokeWidth={isHovered ? "2" : "0.8"}
                        style={{
                          transition:
                            "stroke 150ms ease, stroke-width 150ms ease",
                        }}
                        className="transition-all cursor-pointer"
                        onMouseEnter={() => {
                          setHoveredElement({
                            id: feature.id,
                            name: feature.properties.name,
                            type: "region",
                            salesVolume: sale ? sale.salesVolume : 0,
                            totalRevenue: sale ? sale.totalRevenue : 0,
                            active: hasSales,
                          });
                        }}
                      />
                    );
                  })}
                </g>
              </svg>
            )}
          </div>

          {/* FLOATING RICH TOOLTIP */}
          <AnimatePresence>
            {hoveredElement && (
              <motion.div
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.96 }}
                transition={{ duration: 0.1 }}
                style={{
                  position: "absolute",
                  left: tooltipPos.x,
                  top: tooltipPos.y,
                  pointerEvents: "none",
                  zIndex: 150,
                }}
                className="bg-white/95 backdrop-blur-md text-slate-900 rounded-2xl border border-slate-200/80 p-4 shadow-xl min-w-[210px] flex flex-col gap-2.5 font-sans"
              >
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <span className="text-[9px] font-black uppercase tracking-wider text-slate-400">
                    {hoveredElement.type === "region"
                      ? `Provincia/Región (${hoveredElement.id})`
                      : `País (${hoveredElement.id})`}
                  </span>
                  <div
                    className={`w-2 h-2 rounded-full ${hoveredElement.active ? "bg-emerald-500 animate-pulse" : "bg-slate-300"}`}
                  />
                </div>

                <h5 className="font-black text-sm uppercase text-slate-900 tracking-wide m-0">
                  {hoveredElement.name}
                </h5>

                {hoveredElement.active ? (
                  <div className="space-y-1.5 pt-0.5">
                    <div className="flex justify-between items-center text-[10px] font-medium text-slate-600">
                      <span className="flex items-center gap-1">
                        <TrendingUp className="w-3.5 h-3.5 text-slate-400" />
                        Conversiones BOFU:
                      </span>
                      <strong className="font-bold text-slate-900 text-xs">
                        {hoveredElement.salesVolume.toLocaleString("es-AR")}
                      </strong>
                    </div>
                    <div className="flex justify-between items-center text-[10px] font-medium text-slate-600">
                      <span className="flex items-center gap-1">
                        <DollarSign className="w-3.5 h-3.5 text-slate-400" />
                        Facturación Total:
                      </span>
                      <strong className="font-black text-emerald-600 tracking-tight text-xs">
                        {formatValue(hoveredElement.totalRevenue)}
                      </strong>
                    </div>
                  </div>
                ) : (
                  <span className="text-[9px] font-bold uppercase text-slate-400 tracking-wider">
                    Sin Conversiones
                  </span>
                )}

                {hoveredElement.canDrillDown && (
                  <div className="border-t border-slate-100 pt-1.5 mt-1">
                    <span className="text-[8px] font-black text-blue-600 uppercase tracking-wider flex items-center gap-1 animate-pulse">
                      Haz click para ver regiones
                    </span>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* RIGHT SIDEBAR: METRICS + LIST */}
        <div className="w-full lg:w-[40%] flex flex-col md:flex-row print:flex-row gap-3 max-h-[500px] print:max-h-none">
          {/* COL 1: METRICS & LEGEND */}
          <div className="w-full md:w-[45%] flex flex-col gap-3">
            {/* METRICS PANEL */}
            <div
              id="map-summary-panel"
              className="flex flex-col gap-2.5 bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 shadow-xs"
            >
              <div className="flex flex-col gap-0.5">
                <span className="text-[7.5px] font-black uppercase text-slate-400 tracking-wider">
                  Zonas Activas
                </span>
                <span className="text-xs font-black text-slate-900">
                  {summary.zonesCount} Provincias / Países
                </span>
              </div>
              <div className="w-full h-[1px] bg-slate-200" />
              <div className="flex flex-col gap-0.5">
                <span className="text-[7.5px] font-black uppercase text-slate-400 tracking-wider">
                  Volumen Total BOFU
                </span>
                <span className="text-xs font-black text-slate-900">
                  {summary.totalSales.toLocaleString("es-AR")} Conversiones
                </span>
              </div>
              <div className="w-full h-[1px] bg-slate-200" />
              <div className="flex flex-col gap-0.5">
                <span className="text-[7.5px] font-black uppercase text-slate-400 tracking-wider">
                  Facturación Consolidada
                </span>
                <span className="text-xs font-black text-emerald-600">
                  {formatValue(summary.totalRev)}
                </span>
              </div>
            </div>

            {/* MAP LEGEND */}
            <div className="bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 flex flex-col gap-2 shadow-xs">
              <span className="text-[7.5px] font-black uppercase tracking-widest text-slate-400">
                Actividad de Ventas
              </span>
              <div className="flex flex-col gap-1.5 mt-0.5">
                <div
                  className="w-full h-1.5 rounded-full"
                  style={{
                    background:
                      "linear-gradient(to right, rgb(255, 0, 0), rgb(255, 255, 0), rgb(0, 255, 0), rgba(0, 150, 255, 0.8))",
                  }}
                />
                <div className="flex justify-between items-center text-[7.5px] font-black uppercase tracking-wider text-slate-500">
                  <span>Alta</span>
                  <span>Baja</span>
                </div>
              </div>
            </div>
          </div>

          {/* COL 2: REGIONS LIST */}
          <div className="w-full md:w-[55%] flex-1 min-h-[350px] bg-slate-50 border border-slate-100 rounded-xl flex flex-col overflow-hidden print:overflow-visible shadow-xs max-h-[500px] print:max-h-none">
            <div className="px-3 py-2 border-b border-slate-200 bg-white shadow-sm z-10 flex justify-between items-center">
              <span className="text-[8px] font-black uppercase text-slate-400 tracking-wider">
                {selectedCountry ? "Top Regiones" : "Top Países"}
              </span>
            </div>
            <div className="flex-1 overflow-y-auto print:overflow-visible p-1.5 flex flex-col gap-0.5">
              {listData.length === 0 ? (
                <div className="text-[10px] text-center text-slate-400 py-6 font-medium">
                  No hay zonas activas
                </div>
              ) : (
                listData.map((item, idx) => (
                  <div
                    key={item.id}
                    className="flex flex-col gap-0.5 px-2 py-1 border-b border-slate-100/50 hover:bg-white rounded transition-colors cursor-default group"
                  >
                    <div className="flex justify-between items-center">
                      <span className="font-black text-[9px] text-slate-800 uppercase truncate pr-2 group-hover:text-blue-600 transition-colors">
                        {idx + 1}. {item.name}
                      </span>
                      <span className="text-[8.5px] font-black text-slate-500 bg-slate-200/50 px-1 py-0.5 rounded leading-none">
                        {item.salesVolume}
                      </span>
                    </div>
                    <span className="font-black text-emerald-600 text-[9.5px] tracking-tight opacity-90 group-hover:opacity-100 transition-opacity">
                      {formatValue(item.totalRevenue)}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
