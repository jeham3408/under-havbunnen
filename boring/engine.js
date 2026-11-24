// Direct enumeration of one horizontal boundary versus a homogeneous formation.
// The caller passes only observed positions, channels, priors and the forward LUT.
function decodeLibrary(spec) {
  const raw = Uint8Array.from(atob(spec.responses_b64), c => c.charCodeAt(0));
  const view = new DataView(raw.buffer);
  const fields = new Float32Array(raw.length / 4);
  for (let i = 0; i < fields.length; i++) fields[i] = view.getFloat32(4*i, true);
  if (fields.length !== spec.grid.length * spec.pairs.length * spec.sigma.length) {
    throw Error("Feil dimensjoner i Maxwell-biblioteket.");
  }
  return {...spec, fields};
}

function estimateBoundary(lib, window, enabled) {
  if (window.length === 0 || window.length > 5) throw Error("Bruk 1–5 stasjoner.");
  const {grid, pairs, sigma, prior, fields} = lib;
  const nD = grid.length, nCh = sigma.length, nP = pairs.length;
  const current = window[window.length - 1], step = grid[1]-grid[0];
  const used = window.map(s => sigma.map((_,k) => k).filter(k => enabled[k] && Number.isFinite(s.y[k])));
  const measurements = used.reduce((n, channels) => n + channels.length, 0);
  if (!measurements) return {status:"missing", measurements:0, median:null, lo:null, hi:null, pHom:null,
    pBelow:null, pair:null, homogeneousRho:null, side:null, minMeanSquare:null};

  // A fixed absolute boundary implies a different signed distance at each TVD.
  // Restrict all models to the same grid support. No extrapolated fields.
  const steps = window.map(row => (current.tvd-row.tvd)/step);
  const shifts = steps.map(dr => Math.floor(dr));
  const fractions = steps.map((dr,j) => dr-shifts[j]);
  const valid = grid.map((_,i) => steps.every(dr => i+dr >= 0 && i+dr <= nD-1));
  const logw = new Float64Array(nP*nD).fill(-Infinity);
  let top = -Infinity, minChi = Infinity;
  for (let p=0; p<nP; p++) {
    const logPrior = Math.log(prior[p]), offset=p*nD;
    for (let i=0; i<nD; i++) {
      if (!valid[i]) continue;
      let chi=0;
      for (let j=0; j<window.length; j++) {
        const z=i+shifts[j], a=(offset+z)*nCh, b=(offset+Math.min(z+1,nD-1))*nCh;
        for (const k of used[j]) {
          const predicted=fields[a+k]+fractions[j]*(fields[b+k]-fields[a+k]);
          const residual=(window[j].y[k]-predicted)/sigma[k];
          chi+=residual*residual;
        }
      }
      logw[offset+i]=logPrior-chi/2;
      if (logw[offset+i]>top) top=logw[offset+i];
      if (chi<minChi) minChi=chi;
    }
  }
  if (!Number.isFinite(top)) throw Error("Ingen felles dybder i oppslagsområdet.");
  const depthMass=new Float64Array(nD), pairMass=new Float64Array(nP);
  let homogeneous=0, boundary=0, best=-1, bestHom=-1;
  for (let p=0; p<nP; p++) {
    const uniform=pairs[p][0]===pairs[p][1];
    for (let i=0; i<nD; i++) {
      const weight=Math.exp(logw[p*nD+i]-top);
      pairMass[p]+=weight;
      if (!uniform) depthMass[i]+=weight;
    }
    if (uniform) {
      homogeneous+=pairMass[p];
      if (bestHom<0 || pairMass[p]>pairMass[bestHom]) bestHom=p;
    } else {
      boundary+=pairMass[p];
      if (best<0 || pairMass[p]>pairMass[best]) best=p;
    }
  }
  const pHom=homogeneous/(homogeneous+boundary);
  const q=target=>{
    if (!(boundary>0)) return null;
    let cumulative=0;
    for (let i=0;i<nD;i++) {
      const mass=depthMass[i], targetMass=target*boundary;
      if (mass>0 && cumulative+mass>=targetMass) {
        // The forward-grid mass represents the whole cell, not a boundary
        // exactly at its midpoint. A 0.1 m grid cannot give a zero-width band.
        const lower=i===0?grid[0]:(grid[i-1]+grid[i])/2;
        const upper=i===nD-1?grid[i]:(grid[i]+grid[i+1])/2;
        return lower+(upper-lower)*(targetMass-cumulative)/mass;
      }
      cumulative+=mass;
    }
    return grid[nD-1];
  };
  let below=0, edge=0;
  for(let i=0;i<nD;i++){
    if(grid[i]>0) below+=depthMass[i];
    else if(grid[i]===0) below+=depthMass[i]/2;
    if(Math.abs(grid[i])>=7.5) edge+=depthMass[i];
  }
  const pBelow=boundary>0?below/boundary:null, lo=q(.05), med=q(.5), hi=q(.95);
  const minMeanSquare=minChi/measurements;
  let status="resolved", side=null;
  if (minMeanSquare>3) status="misfit";
  else if (pHom>=.9) status="homogeneous";
  else if (pHom>=.1 || !(boundary>0)) status="ambiguous_model";
  else if (used[used.length-1].length<2) status="insufficient";
  else if (Math.max(pBelow,1-pBelow)<.95 || hi-lo>2 || edge/boundary>.1) status="uncertain";
  else side=pBelow>=.95?"under":"over";
  return {status,measurements,pHom,pBelow,median:med,lo,hi,pair:pairs[best],side,minMeanSquare,
          homogeneousRho:pairs[bestHom][0]};
}

if (typeof module==="object" && module.exports) module.exports={decodeLibrary,estimateBoundary};
