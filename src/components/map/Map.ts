import * as d3 from 'd3';
import * as topojson from 'topojson-client';
import { MapPopup } from './MapPopup';
import { MarketSnapshot, Article, UnderseaCable, Pipeline, MilitaryBase, ConflictZone, Hotspot, EconomicCenter } from '../../types';
import { INTEL_HOTSPOTS, CONFLICT_ZONES, UNDERSEA_CABLES, ECONOMIC_CENTERS, MILITARY_BASES } from '../../config/geo';
import { PIPELINES } from '../../config/pipelines';
import { getDynamicMapData, DynamicMapData } from '../../services/map-adapter';

export class WorldMap {
  private container: HTMLElement;
  private svg!: d3.Selection<SVGSVGElement, unknown, null, undefined>;
  private zoomContainer!: d3.Selection<SVGGElement, unknown, null, undefined>;
  
  private baseLayerGroup!: d3.Selection<SVGGElement, unknown, null, undefined>;
  private dynamicLayerGroup!: d3.Selection<SVGGElement, unknown, null, undefined>;

  private projection!: d3.GeoProjection;
  private pathGenerator!: d3.GeoPath;
  private zoomBehavior!: d3.ZoomBehavior<SVGSVGElement, unknown>;
  private popup!: MapPopup;

  private topoData: any = null;
  private countriesGeo: any = null;

  private marketState: MarketSnapshot | null = null;
  private articles: Article[] = [];
  private dynamicData: DynamicMapData | null = null;
  private baseRendered = false;

  private activeLayers: Record<string, boolean> = {
    cables: true,
    pipelines: true,
    bases: true,
    conflicts: true,
    hotspots: true,
    economic: true,
    news: true
  };

  constructor(containerId: string) {
    const el = document.getElementById(containerId);
    if (!el) {
      throw new Error(`Map container #${containerId} not found.`);
    }
    this.container = el;

    this.initDOM();
    this.initMapProjection();
    this.initPopup();
    this.initControls();
    this.loadMapData();

    // Hook resize listener
    window.addEventListener("resize", () => this.resize());
  }

  private initDOM() {
    this.container.innerHTML = "";

    // Create SVG element
    this.svg = d3.select(this.container)
      .append("svg")
      .attr("class", "map-svg");

    // Create zoom main container
    this.zoomContainer = this.svg.append("g")
      .attr("class", "zoom-container");

    // Add layer groups in proper rendering order (back to front)
    this.baseLayerGroup = this.zoomContainer.append("g").attr("class", "base-layer");
    this.dynamicLayerGroup = this.zoomContainer.append("g").attr("class", "dynamic-layer");

    // Setup zoom behavior (with limits appropriate for a world map)
    this.zoomBehavior = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.8, 12])
      .on("zoom", (event) => {
        this.zoomContainer.attr("transform", event.transform.toString());
        // Scale stroke-widths dynamically to prevent lines becoming too thick when zoomed in
        this.zoomContainer.selectAll(".undersea-cable, .pipeline")
          .style("stroke-width", function() {
            const isMajor = d3.select(this).classed("major-cable") || d3.select(this).classed("pipeline-oil");
            const base = isMajor ? 1.5 : 0.8;
            return `${base / event.transform.k}px`;
          });
        this.zoomContainer.selectAll(".military-base-dot, .economic-center-dot, .hotspot-dot, .news-pulse-dot")
          .attr("r", function() {
            const base = d3.select(this).classed("news-pulse-dot") ? 6 : 4;
            return base / Math.sqrt(event.transform.k);
          });
      });

    this.svg.call(this.zoomBehavior);
  }

  private initMapProjection() {
    // Standard Equirectangular projection focused on center latitudes
    // Shows the full world grid cleanly
    const width = this.container.offsetWidth || 800;
    const height = this.container.offsetHeight || 500;

    const LAT_NORTH = 72;
    const LAT_SOUTH = -56;
    const LAT_RANGE = LAT_NORTH - LAT_SOUTH;
    const LAT_CENTER = (LAT_NORTH + LAT_SOUTH) / 2;

    const scaleForWidth = width / (2 * Math.PI);
    const scaleForHeight = height / (LAT_RANGE * Math.PI / 180);
    const scale = Math.min(scaleForWidth, scaleForHeight);

    this.projection = d3.geoEquirectangular()
      .scale(scale)
      .center([0, LAT_CENTER])
      .translate([width / 2, height / 2]);

    this.pathGenerator = d3.geoPath().projection(this.projection);
  }

  private initPopup() {
    this.popup = new MapPopup(this.container);
  }

  private initControls() {
    // Wire zoom buttons
    const btnIn = document.getElementById("map-zoom-in");
    const btnOut = document.getElementById("map-zoom-out");
    const btnReset = document.getElementById("map-zoom-reset");

    if (btnIn) {
      btnIn.addEventListener("click", () => {
        this.svg.transition().duration(300).call(this.zoomBehavior.scaleBy, 1.4);
      });
    }

    if (btnOut) {
      btnOut.addEventListener("click", () => {
        this.svg.transition().duration(300).call(this.zoomBehavior.scaleBy, 1 / 1.4);
      });
    }

    if (btnReset) {
      btnReset.addEventListener("click", () => {
        this.svg.transition().duration(500).call(
          this.zoomBehavior.transform,
          d3.zoomIdentity
        );
      });
    }

    // Wire layer toggle buttons in the map-header
    const layerButtons = document.querySelectorAll(".map-layer-btn");
    layerButtons.forEach(btn => {
      // Synchronize initial UI state with activeLayers mapping
      const layer = btn.getAttribute("data-layer");
      if (layer) {
        if (this.activeLayers[layer]) {
          btn.classList.add("active");
        } else {
          btn.classList.remove("active");
        }
      }

      btn.addEventListener("click", () => {
        const layerKey = btn.getAttribute("data-layer");
        if (!layerKey) return;

        const active = btn.classList.toggle("active");
        this.activeLayers[layerKey] = active;
        this.renderDynamicLayers();
      });
    });
  }

  private async loadMapData() {
    try {
      const url = "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-50m.json";
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to load topography: status ${response.status}`);
      }
      this.topoData = await response.json();
      this.countriesGeo = topojson.feature(this.topoData, this.topoData.objects.countries);
      
      this.resize();
    } catch (err) {
      console.error("Map: Error loading world map topology JSON:", err);
      this.container.innerHTML = `
        <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; color: var(--accent-red); font-size: 13px; text-align: center; padding: 20px; gap: 10px;">
          <div style="font-weight: bold; font-size: 14px;">Failed to Load Global Geography</div>
          <div style="color: var(--text-muted); font-size: 11px; max-width: 320px;">
            Unable to fetch world-atlas topology geometry. Verify your internet connection or proxy settings.
          </div>
        </div>
      `;
    }
  }

  resize() {
    if (!this.countriesGeo) return;

    const width = this.container.offsetWidth;
    const height = this.container.offsetHeight;

    if (width === 0 || height === 0) return;

    // Adjust projection dimensions dynamically
    const LAT_NORTH = 72;
    const LAT_SOUTH = -56;
    const LAT_RANGE = LAT_NORTH - LAT_SOUTH;
    const LAT_CENTER = (LAT_NORTH + LAT_SOUTH) / 2;

    const scaleForWidth = width / (2 * Math.PI);
    const scaleForHeight = height / (LAT_RANGE * Math.PI / 180);
    const scale = Math.min(scaleForWidth, scaleForHeight);

    this.projection
      .scale(scale)
      .center([0, LAT_CENTER])
      .translate([width / 2, height / 2]);

    this.pathGenerator.projection(this.projection);

    // Redraw static base
    this.renderBaseLayers(width, height);
    // Redraw active dynamic layers
    this.renderDynamicLayers();
  }

  update(market: MarketSnapshot | null, articles: Article[]) {
    this.marketState = market;
    this.articles = articles;
    this.dynamicData = getDynamicMapData(market, articles);

    // Re-render
    this.renderBaseLayers(this.container.offsetWidth, this.container.offsetHeight);
    this.renderDynamicLayers();
  }

  private renderBaseLayers(width: number, height: number) {
    if (!this.countriesGeo) return;

    // Reset base layer if width/height changed
    this.baseLayerGroup.selectAll("*").remove();

    // 1. Draw Ocean background
    this.baseLayerGroup.append("rect")
      .attr("class", "map-ocean")
      .attr("x", -width * 2)
      .attr("y", -height * 2)
      .attr("width", width * 5)
      .attr("height", height * 5)
      .attr("fill", "var(--map-bg, #0b0f19)");

    // 2. Draw Graticules
    const graticule = d3.geoGraticule().step([15, 15]);
    this.baseLayerGroup.append("path")
      .datum(graticule)
      .attr("class", "map-graticule")
      .attr("d", this.pathGenerator)
      .attr("fill", "none")
      .attr("stroke", "var(--border-muted, rgba(255, 255, 255, 0.03))")
      .attr("stroke-width", "0.5px");

    // 3. Render Countries
    const self = this;
    this.baseLayerGroup.selectAll("path.country")
      .data(this.countriesGeo.features)
      .enter()
      .append("path")
      .attr("class", "country")
      .attr("d", (d: any) => this.pathGenerator(d) || "")
      .attr("fill", "var(--map-land, #151d30)")
      .attr("stroke", "var(--map-border, #0d1321)")
      .attr("stroke-width", "0.6px")
      .each(function(d: any) {
        // Compute country-level risk if dynamicData is available
        const countryId = d.id; // Numeric ID (e.g. 356 for India, 840 for US)
        const name = d.properties.name;
        
        d3.select(this)
          .on("mouseover", (event) => {
            const risk = self.dynamicData?.countryRiskMap[d.id] || self.dynamicData?.countryRiskMap[name] || 'low';
            
            const containerRect = self.container.getBoundingClientRect();
            const mouseX = event.clientX - containerRect.left;
            const mouseY = event.clientY - containerRect.top;

            const matchingNews = self.articles.filter(art => {
              const text = `${art.title} ${art.summary || ''}`.toLowerCase();
              return text.includes(name.toLowerCase());
            });

            const html = `
              <div class="popup-detail-row"><strong>Geopolitical Risk:</strong> <span class="badge badge-${risk}">${risk.toUpperCase()}</span></div>
              <div class="popup-detail-row"><strong>Active Signals:</strong> ${matchingNews.length} articles</div>
            `;

            self.popup.show(mouseX, mouseY, {
              title: name,
              subtitle: "GEOPOLITICAL BOUNDARY",
              htmlContent: html,
              articles: matchingNews
            });
          })
          .on("mousemove", (event) => {
            const containerRect = self.container.getBoundingClientRect();
            const mouseX = event.clientX - containerRect.left;
            const mouseY = event.clientY - containerRect.top;
            self.popup.updatePosition(mouseX, mouseY);
          })
          .on("mouseout", () => {
            self.popup.hide();
          });
      });

    this.baseRendered = true;
    this.updateCountryRiskColors();
  }

  private updateCountryRiskColors() {
    if (!this.dynamicData || !this.baseRendered) return;

    // Apply risk fill colors based on adapter mapping
    const riskMap = this.dynamicData.countryRiskMap;
    this.baseLayerGroup.selectAll<SVGPathElement, any>("path.country")
      .transition()
      .duration(400)
      .style("fill", (d: any) => {
        // Try mapping by name or 3-digit ISO code if present
        const name = d.properties.name;
        const risk = riskMap[name] || 'low';
        
        switch (risk) {
          case 'severe': return 'rgba(239, 68, 68, 0.22)';  // Red
          case 'high': return 'rgba(249, 115, 22, 0.16)';    // Orange
          case 'moderate': return 'rgba(245, 158, 11, 0.10)'; // Amber
          case 'low':
          default:
            return "var(--map-land, #151d30)";
        }
      });
  }

  private renderDynamicLayers() {
    this.dynamicLayerGroup.selectAll("*").remove();

    if (this.activeLayers.cables) this.renderCables();
    if (this.activeLayers.pipelines) this.renderPipelines();
    if (this.activeLayers.bases) this.renderBases();
    if (this.activeLayers.conflicts) this.renderConflicts();
    if (this.activeLayers.hotspots) this.renderHotspots();
    if (this.activeLayers.economic) this.renderEconomicCenters();
    if (this.activeLayers.news) this.renderNewsPulses();
  }

  private renderCables() {
    const self = this;
    const g = this.dynamicLayerGroup.append("g").attr("class", "cables-sublayer");

    UNDERSEA_CABLES.forEach(cable => {
      const lineGeo = {
        type: "Feature",
        geometry: {
          type: "LineString",
          coordinates: cable.points
        }
      };

      g.append("path")
        .datum(lineGeo)
        .attr("class", `undersea-cable ${cable.major ? 'major-cable' : 'minor-cable'}`)
        .attr("d", (d: any) => this.pathGenerator(d) || "")
        .on("mouseover", (event) => {
          const containerRect = self.container.getBoundingClientRect();
          const mouseX = event.clientX - containerRect.left;
          const mouseY = event.clientY - containerRect.top;

          const html = `
            <div class="popup-detail-row"><strong>Owners:</strong> ${cable.owners?.join(', ') || 'Unknown'}</div>
            <div class="popup-detail-row"><strong>Capacity:</strong> ${cable.capacityTbps ? cable.capacityTbps + ' Tbps' : 'N/A'}</div>
            <div class="popup-detail-row"><strong>RFS Year:</strong> ${cable.rfsYear || 'N/A'}</div>
            <div class="popup-detail-row"><strong>Landing Sites:</strong> ${cable.landingPoints?.slice(0, 4).map(lp => `${lp.city || lp.countryName}`).join(', ') || 'N/A'}</div>
          `;

          self.popup.show(mouseX, mouseY, {
            title: cable.name,
            subtitle: "UNDERSEA FIBER TRUNKLINE",
            htmlContent: html
          });
        })
        .on("mousemove", (event) => {
          const containerRect = self.container.getBoundingClientRect();
          self.popup.updatePosition(event.clientX - containerRect.left, event.clientY - containerRect.top);
        })
        .on("mouseout", () => self.popup.hide());
    });
  }

  private renderPipelines() {
    const self = this;
    const g = this.dynamicLayerGroup.append("g").attr("class", "pipelines-sublayer");

    PIPELINES.forEach(pipe => {
      const lineGeo = {
        type: "Feature",
        geometry: {
          type: "LineString",
          coordinates: pipe.points
        }
      };

      g.append("path")
        .datum(lineGeo)
        .attr("class", `pipeline pipeline-${pipe.type} pipeline-${pipe.status}`)
        .attr("d", (d: any) => this.pathGenerator(d) || "")
        .on("mouseover", (event) => {
          const containerRect = self.container.getBoundingClientRect();
          const mouseX = event.clientX - containerRect.left;
          const mouseY = event.clientY - containerRect.top;

          const html = `
            <div class="popup-detail-row"><strong>Type:</strong> <span class="badge">${pipe.type.toUpperCase()}</span></div>
            <div class="popup-detail-row"><strong>Status:</strong> ${pipe.status.toUpperCase()}</div>
            <div class="popup-detail-row"><strong>Operator:</strong> ${pipe.operator || 'N/A'}</div>
            <div class="popup-detail-row"><strong>Capacity:</strong> ${pipe.capacity || 'N/A'}</div>
            <div class="popup-detail-row"><strong>Length:</strong> ${pipe.length || 'N/A'}</div>
            <div class="popup-detail-row"><strong>Transit:</strong> ${pipe.countries?.slice(0, 4).join(', ') || 'N/A'}</div>
          `;

          self.popup.show(mouseX, mouseY, {
            title: pipe.name,
            subtitle: "ENERGY PIPELINE INFRASTRUCTURE",
            htmlContent: html
          });
        })
        .on("mousemove", (event) => {
          const containerRect = self.container.getBoundingClientRect();
          self.popup.updatePosition(event.clientX - containerRect.left, event.clientY - containerRect.top);
        })
        .on("mouseout", () => self.popup.hide());
    });
  }

  private renderBases() {
    const self = this;
    const g = this.dynamicLayerGroup.append("g").attr("class", "bases-sublayer");

    MILITARY_BASES.forEach(base => {
      const coords = this.projection([base.lon, base.lat]);
      if (!coords) return;

      const marker = g.append("g")
        .attr("class", `military-base-node base-${base.type}`)
        .attr("transform", `translate(${coords[0]}, ${coords[1]})`);

      marker.append("circle")
        .attr("class", "military-base-dot")
        .attr("r", 3.2)
        .on("mouseover", (event) => {
          const containerRect = self.container.getBoundingClientRect();
          const mouseX = event.clientX - containerRect.left;
          const mouseY = event.clientY - containerRect.top;

          const html = `
            <div class="popup-detail-row"><strong>Country Host:</strong> ${base.country || 'N/A'}</div>
            <div class="popup-detail-row"><strong>Force Type:</strong> ${base.type.toUpperCase()}</div>
            <div class="popup-detail-row"><strong>Arm:</strong> ${base.arm || 'N/A'}</div>
            <div class="popup-detail-row"><strong>Status:</strong> ${(base.status || '').toUpperCase()}</div>
            <div class="popup-detail-row" style="margin-top: 5px; font-size: 10px; color: var(--text-muted);">${base.description || ''}</div>
          `;

          self.popup.show(mouseX, mouseY, {
            title: base.name,
            subtitle: "MILITARY OUTPOST / BASE",
            htmlContent: html
          });
        })
        .on("mousemove", (event) => {
          const containerRect = self.container.getBoundingClientRect();
          self.popup.updatePosition(event.clientX - containerRect.left, event.clientY - containerRect.top);
        })
        .on("mouseout", () => self.popup.hide());
    });
  }

  private renderConflicts() {
    const self = this;
    const g = this.dynamicLayerGroup.append("g").attr("class", "conflicts-sublayer");

    CONFLICT_ZONES.forEach(zone => {
      // 1. Draw boundary Polygon
      const polyGeo = {
        type: "Feature",
        geometry: {
          type: "Polygon",
          coordinates: [zone.coords]
        }
      };

      g.append("path")
        .datum(polyGeo)
        .attr("class", `conflict-zone-poly conflict-intensity-${zone.intensity || 'medium'}`)
        .attr("d", (d: any) => this.pathGenerator(d) || "");

      // 2. Draw pulsing center ring
      const centerCoords = this.projection(zone.center);
      if (centerCoords) {
        const pulse = g.append("g")
          .attr("class", `conflict-pulse-node intensity-${zone.intensity || 'medium'}`)
          .attr("transform", `translate(${centerCoords[0]}, ${centerCoords[1]})`);

        pulse.append("circle")
          .attr("class", "conflict-pulse-ring");

        pulse.append("circle")
          .attr("class", "conflict-center-dot")
          .attr("r", 4.5)
          .on("mouseover", (event) => {
            const containerRect = self.container.getBoundingClientRect();
            const mouseX = event.clientX - containerRect.left;
            const mouseY = event.clientY - containerRect.top;

            const html = `
              <div class="popup-detail-row"><strong>Intensity:</strong> <span class="badge badge-severe">${(zone.intensity || 'HIGH').toUpperCase()}</span></div>
              <div class="popup-detail-row"><strong>Parties:</strong> ${zone.parties?.join(', ') || 'N/A'}</div>
              <div class="popup-detail-row"><strong>Casualties:</strong> ${zone.casualties || 'N/A'}</div>
              <div class="popup-detail-row"><strong>Displaced:</strong> ${zone.displaced || 'N/A'}</div>
              <div class="popup-detail-row" style="margin-top: 5px;"><strong>Details:</strong> ${zone.description || ''}</div>
              <div class="popup-detail-row" style="margin-top: 5px; font-weight: bold; color: var(--accent-red);">Key Developments:</div>
              <ul class="popup-bullet-list" style="margin: 3px 0 0 12px; padding: 0; font-size: 10px; line-height: 1.3;">
                ${zone.keyDevelopments?.map(d => `<li>${d}</li>`).join('') || 'None'}
              </ul>
            `;

            self.popup.show(mouseX, mouseY, {
              title: zone.name,
              subtitle: "ACTIVE GEOPOLITICAL CONFLICT",
              htmlContent: html
            });
          })
          .on("mousemove", (event) => {
            const containerRect = self.container.getBoundingClientRect();
            self.popup.updatePosition(event.clientX - containerRect.left, event.clientY - containerRect.top);
          })
          .on("mouseout", () => self.popup.hide());
      }
    });
  }

  private renderHotspots() {
    const self = this;
    const g = this.dynamicLayerGroup.append("g").attr("class", "hotspots-sublayer");

    INTEL_HOTSPOTS.forEach(hotspot => {
      const coords = this.projection([hotspot.lon, hotspot.lat]);
      if (!coords) return;

      const isActive = self.dynamicData?.activeHotspotIds.has(hotspot.id) || false;
      const matchingNews = self.dynamicData?.hotspotNews[hotspot.id] || [];

      const marker = g.append("g")
        .attr("class", `hotspot-node ${isActive ? 'hotspot-active' : ''}`)
        .attr("transform", `translate(${coords[0]}, ${coords[1]})`);

      if (isActive) {
        marker.append("circle").attr("class", "hotspot-pulse-ring");
      }

      marker.append("circle")
        .attr("class", `hotspot-dot ${isActive ? 'active' : 'inactive'}`)
        .attr("r", isActive ? 5.5 : 4)
        .on("mouseover", (event) => {
          const containerRect = self.container.getBoundingClientRect();
          const mouseX = event.clientX - containerRect.left;
          const mouseY = event.clientY - containerRect.top;

          const html = `
            <div class="popup-detail-row"><strong>Focus:</strong> ${hotspot.subtext || 'Monitoring'}</div>
            <div class="popup-detail-row"><strong>Escalation Score:</strong> ${hotspot.escalationScore || 1}/5 (${hotspot.escalationTrend || 'stable'})</div>
            <div class="popup-detail-row"><strong>Risk Description:</strong> ${hotspot.description || ''}</div>
            <div class="popup-detail-row" style="margin-top: 5px; font-weight: bold;">Indicators:</div>
            <ul class="popup-bullet-list" style="margin: 3px 0 0 12px; padding: 0; font-size: 10px; line-height: 1.3;">
              ${hotspot.escalationIndicators?.map(i => `<li>${i}</li>`).join('') || 'None'}
            </ul>
          `;

          self.popup.show(mouseX, mouseY, {
            title: hotspot.name,
            subtitle: isActive ? "ALERT: INTEL HOTSPOT TRIGGERED" : "MONITORED REGION",
            htmlContent: html,
            articles: matchingNews
          });
        })
        .on("mousemove", (event) => {
          const containerRect = self.container.getBoundingClientRect();
          self.popup.updatePosition(event.clientX - containerRect.left, event.clientY - containerRect.top);
        })
        .on("mouseout", () => self.popup.hide());
    });
  }

  private renderEconomicCenters() {
    const self = this;
    const g = this.dynamicLayerGroup.append("g").attr("class", "economic-sublayer");

    ECONOMIC_CENTERS.forEach(center => {
      const coords = this.projection([center.lon, center.lat]);
      if (!coords) return;

      const dynamicStatus = self.dynamicData?.economicCenterStatus[center.id] || null;
      let statusClass = "perf-neutral";
      let pulseColorClass = "";

      if (dynamicStatus) {
        if (dynamicStatus.change > 0.05) {
          statusClass = "perf-up";
          pulseColorClass = "up-pulse";
        } else if (dynamicStatus.change < -0.05) {
          statusClass = "perf-down";
          pulseColorClass = "down-pulse";
        }
      }

      const marker = g.append("g")
        .attr("class", `economic-center-node ${pulseColorClass}`)
        .attr("transform", `translate(${coords[0]}, ${coords[1]})`);

      if (pulseColorClass) {
        marker.append("circle").attr("class", "economic-pulse-ring");
      }

      marker.append("circle")
        .attr("class", `economic-center-dot ${statusClass}`)
        .attr("r", 4.5)
        .on("mouseover", (event) => {
          const containerRect = self.container.getBoundingClientRect();
          const mouseX = event.clientX - containerRect.left;
          const mouseY = event.clientY - containerRect.top;

          const openHours = center.marketHours 
            ? `${center.marketHours.open} - ${center.marketHours.close} (${center.marketHours.timezone})` 
            : 'N/A';

          const html = `
            <div class="popup-detail-row"><strong>Type:</strong> ${center.type.replace('-', ' ').toUpperCase()}</div>
            <div class="popup-detail-row"><strong>Country:</strong> ${center.country}</div>
            <div class="popup-detail-row"><strong>Trading Hours:</strong> ${openHours}</div>
            <div class="popup-detail-row" style="margin-top: 5px;"><strong>Details:</strong> ${center.description || 'N/A'}</div>
            ${dynamicStatus ? `
              <div class="popup-detail-row" style="margin-top: 8px; font-weight: bold; border-top: 1px solid rgba(255,255,255,0.06); padding-top: 6px;">
                Live Tracker: <span class="${statusClass}" style="font-size: 11px;">${dynamicStatus.text}</span>
              </div>
            ` : ''}
          `;

          self.popup.show(mouseX, mouseY, {
            title: center.name,
            subtitle: "GLOBAL FINANCIAL INFRASTRUCTURE",
            htmlContent: html
          });
        })
        .on("mousemove", (event) => {
          const containerRect = self.container.getBoundingClientRect();
          self.popup.updatePosition(event.clientX - containerRect.left, event.clientY - containerRect.top);
        })
        .on("mouseout", () => self.popup.hide());
    });
  }

  private renderNewsPulses() {
    const self = this;
    if (!this.dynamicData || this.dynamicData.newsPulses.length === 0) return;

    const g = this.dynamicLayerGroup.append("g").attr("class", "news-pulses-sublayer");

    this.dynamicData.newsPulses.forEach(pulse => {
      const coords = this.projection([pulse.lon, pulse.lat]);
      if (!coords) return;

      const node = g.append("g")
        .attr("class", `news-pulse-node intensity-${pulse.intensity}`)
        .attr("transform", `translate(${coords[0]}, ${coords[1]})`);

      node.append("circle")
        .attr("class", "news-pulse-ring-outer");

      node.append("circle")
        .attr("class", "news-pulse-dot")
        .attr("r", 5)
        .on("mouseover", (event) => {
          const containerRect = self.container.getBoundingClientRect();
          const mouseX = event.clientX - containerRect.left;
          const mouseY = event.clientY - containerRect.top;

          const html = `
            <div class="popup-detail-row" style="font-weight: bold; color: var(--accent-orange); margin-bottom: 5px;">Latest Bulletins (${pulse.articles.length}):</div>
          `;

          self.popup.show(mouseX, mouseY, {
            title: `News Flash: ${pulse.locationName}`,
            subtitle: "REAL-TIME CORRESPONDENT SIGNAL",
            htmlContent: html,
            articles: pulse.articles
          });
        })
        .on("mousemove", (event) => {
          const containerRect = self.container.getBoundingClientRect();
          self.popup.updatePosition(event.clientX - containerRect.left, event.clientY - containerRect.top);
        })
        .on("mouseout", () => self.popup.hide());
    });
  }

  destroy() {
    this.popup.destroy();
    this.svg.remove();
  }
}
