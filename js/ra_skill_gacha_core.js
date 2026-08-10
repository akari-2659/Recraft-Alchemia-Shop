(function(global){
  'use strict';

  const COST_BY_RANK = Object.freeze({1:10,2:25,3:45,4:70,5:100});

  function asInt(value, fallback=0){
    const n = Number(value);
    return Number.isFinite(n) ? Math.floor(n) : fallback;
  }

  function enabledLike(value){
    if(value === false) return false;
    return String(value ?? 'TRUE').trim().toUpperCase() !== 'FALSE';
  }

  function enabledPool(master, rank){
    const r = asInt(rank, 1);
    return (master?.skills || []).filter(skill => skill && enabledLike(skill.enabled) && asInt(skill.rank, 0) === r && asInt(skill.drawWeight, 0) > 0);
  }

  function weightedPick(pool, random=Math.random){
    const total = pool.reduce((sum, skill) => sum + Math.max(0, Number(skill.drawWeight) || 0), 0);
    if(!pool.length || total <= 0) throw new Error('抽選対象スキルがありません。');
    let cursor = Math.min(0.999999999999, Math.max(0, Number(random()) || 0)) * total;
    for(const skill of pool){
      cursor -= Math.max(0, Number(skill.drawWeight) || 0);
      if(cursor < 0) return skill;
    }
    return pool[pool.length - 1];
  }

  function normalizeState(raw={}){
    const slots = Math.max(2, asInt(raw.crystalSlots, 2));
    const acquired = Array.isArray(raw.acquiredSkillIds) ? [...new Set(raw.acquiredSkillIds.map(String).filter(Boolean))] : [];
    const equipped = Array.isArray(raw.equippedSkillIds) ? raw.equippedSkillIds.slice(0, slots).map(v => String(v || '')) : [];
    while(equipped.length < slots) equipped.push('');
    const fragments = {};
    for(let rank=1; rank<=5; rank++) fragments[String(rank)] = Math.max(0, asInt(raw.resonanceFragments?.[String(rank)], 0));
    return {
      version: 1,
      crystalSlots: slots,
      acquiredSkillIds: acquired,
      equippedSkillIds: equipped,
      resonanceFragments: fragments,
      drawHistory: Array.isArray(raw.drawHistory) ? raw.drawHistory.slice(-200) : []
    };
  }

  function draw(master, rawState, rank, count, random=Math.random){
    const state = normalizeState(rawState);
    const r = asInt(rank, 1);
    const n = Math.max(1, Math.min(100, asInt(count, 1)));
    const pool = enabledPool(master, r);
    if(!pool.length) throw new Error(`★${r}の抽選対象がありません。`);
    const acquired = new Set(state.acquiredSkillIds);
    const results = [];
    for(let i=0; i<n; i++){
      const skill = weightedPick(pool, random);
      const duplicate = acquired.has(skill.id);
      if(duplicate){
        state.resonanceFragments[String(r)] = (state.resonanceFragments[String(r)] || 0) + 1;
      }else{
        acquired.add(skill.id);
      }
      const row = {
        at: new Date().toISOString(), rank:r, skillId:skill.id, skillName:skill.name,
        duplicate, fragmentRank: duplicate ? r : null
      };
      state.drawHistory.push(row);
      results.push({...row, skill});
    }
    state.acquiredSkillIds = [...acquired];
    state.drawHistory = state.drawHistory.slice(-200);
    return {state, results, requiredStars:(COST_BY_RANK[r] || 0) * n};
  }

  function probabilityRows(master, rank){
    const pool = enabledPool(master, rank);
    const total = pool.reduce((sum, skill) => sum + Number(skill.drawWeight || 0), 0);
    return pool.map(skill => ({...skill, probability: total > 0 ? Number(skill.drawWeight || 0) / total : 0}));
  }

  global.RASkillGachaCore = Object.freeze({COST_BY_RANK, enabledPool, weightedPick, normalizeState, draw, probabilityRows});
})(window);
