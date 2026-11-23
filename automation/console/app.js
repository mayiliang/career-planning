'use strict';

const $ = id => document.getElementById(id);
const phases = [['plan', '研究规划'], ['publish', '发布任务'], ['develop', '开发实现'], ['validate', '验证交付'], ['review', '产品验收'], ['accept', '完成归档']];
const phaseName = p => p === 'recover' ? '恢复保存成果' : phases.find(x => x[0] === p)?.[1] || '准备下一步';
const dateFormat = new Intl.DateTimeFormat('zh-CN', {timeZone: 'Asia/Shanghai', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false});
let state = null, currentView = 'overview', logSource = 'events', fetching = false, busy = false, pendingId = null, toastTimer;
let logData = [], visibleLogText = '', lastBody = null, lastHistory = null, lastActivity = null, lastLogRender = null;

function text(id, value) { $(id).textContent = value ?? ''; }
function visible(id, show) { $(id).classList.toggle('hidden', !show); }
function element(tag, className, value) { const el = document.createElement(tag); if (className) el.className = className; if (value != null) el.textContent = value; return el; }
function date(value) { if (!value) return '—'; const d = new Date(typeof value === 'number' ? value * 1000 : value); return Number.isNaN(d.getTime()) ? '—' : dateFormat.format(d); }
function countdown(value) { const seconds = Math.max(0, Math.ceil(value - Date.now()/1000)); if (!seconds) return '即将检查'; if (seconds >= 3600) return `${Math.floor(seconds/3600)} 小时 ${Math.ceil(seconds%3600/60)} 分钟`; if (seconds >= 60) return `${Math.floor(seconds/60)} 分 ${seconds%60} 秒`; return `${seconds} 秒`; }
function roleName(phase) { return ['plan', 'publish', 'review', 'accept'].includes(phase) ? '产品经理' : phase === 'validate' ? '调度器' : '开发者'; }
function toast(message) { text('toast', message); visible('toast', true); clearTimeout(toastTimer); toastTimer = setTimeout(() => visible('toast', false), 4500); }
function empty(title, description, action) { const box = element('div', 'empty'); box.append(element('div', 'empty-symbol', '◇'), element('h3', '', title), element('p', '', description)); if (action) { const button = element('button', 'button quiet', '回到当前任务'); button.dataset.view = 'overview'; box.append(button); } return box; }

function describeStatus(s) {
  if (!s.runner_online) return {title: '调度服务未运行', meta: '进度已保留', tone: 'paused'};
  if (s.status === 'needs_attention') return {title: '需要处理后继续', meta: '检查点已保存', tone: 'error'};
  if (s.paused) return {title: s.status.startsWith('running:') ? '正在暂停' : '流程已暂停', meta: '当前任务保留', tone: 'paused'};
  if (s.status === 'waiting:research' && s.blockers?.length) return {title:'存在暂缓任务', meta:'等待恢复或下次复查', tone:'warning'};
  const waiting = {
    'waiting:quota': s.quota_wait_scope === 'github' ? ['等待 GitHub 限流恢复', '按计划复查'] : ['等待额度恢复', '定期同步额度'],
    'waiting:retry': ['等待重试', `第 ${s.failures || 1} 次重试`],
    'waiting:startup': ['正在恢复连接', '启动检查未完成'],
    'waiting:research': ['定期研究待命', '下一轮会自动开始'],
  }[s.status];
  if (waiting) return {title: waiting[0], meta: waiting[1], tone: 'warning'};
  return {title: {plan: '产品经理研究中', publish: '正在发布任务', develop: '开发者实现中', validate: '正在验证交付', review: '产品经理验收中', accept: '正在完成归档', recover:'正在恢复已保存工作'}[s.phase] || '准备下一步', meta: roleName(s.phase), tone: ''};
}

function renderMarkdown(container, source) {
  container.replaceChildren(); let list = null, code = null;
  for (const line of source.split('\n')) {
    if (line.trim().startsWith('```')) { if (code) { container.append(code); code = null; } else code = element('pre'); list = null; continue; }
    if (code) { code.textContent += line + '\n'; continue; }
    if (!line.trim()) { list = null; continue; }
    if (/^#{1,6}\s/.test(line)) { container.append(element('h3', '', line.replace(/^#{1,6}\s+/, ''))); list = null; }
    else if (/^\s*[-*]\s/.test(line)) { if (!list) { list = element('ul'); container.append(list); } list.append(element('li', '', line.replace(/^\s*[-*]\s+/, '').replace(/\*\*(.*?)\*\*/g, '$1'))); }
    else { list = null; container.append(element('p', '', line.replace(/\*\*(.*?)\*\*/g, '$1'))); }
  }
  if (code) container.append(code);
}

function render(s) {
  state = s;
  const info = describeStatus(s), task = s.task;
  text('bar-status', info.title); text('status-title', info.title); text('status-meta', info.meta); $('status-strip').className = 'status-strip ' + info.tone;
  const waiting = s.status === 'waiting:research';
  text('task-title', task?.title || (waiting ? (s.blockers?.length ? '当前没有执行中的任务' : '等待下一轮研究') : '等待调度器报告当前任务'));
  const decision = task ? (task.recovery?.reason || task.decision || '') : (waiting && s.blockers?.length ? '下方流程等待下一项任务；可查看上方暂缓任务及恢复条件。' : '');
  text('task-description', decision.length > 180 ? decision.slice(0, 180).trimEnd() + '…' : decision);
  text('decision-full', decision); visible('decision-details', decision.length > 180);
  if (task?.url) { $('issue-link').href = task.url; text('issue-link', `Issue #${task.issue_number} ↗`); }
  visible('issue-link', !!task?.url);
  if (task?.priority) text('priority', task.priority); visible('priority', !!task?.priority);
  $('repo-link').href = s.repository_url || 'https://github.com/mayiliang/career-planning/tree/auto_coding';
  const index = phases.findIndex(x => x[0] === (s.phase === 'recover' ? 'develop' : s.phase));
  $('pipeline').replaceChildren(...phases.map(([key, label], i) => {
    const li = element('li', i < index ? 'done' : i === index ? 'current' : '', label);
    if (i === index && info.tone === 'warning') li.classList.add('waiting');
    if (i === index) li.setAttribute('aria-current', 'step');
    li.append(element('span', 'step-dot', i < index ? '✓' : String(i + 1))); return li;
  }));
  updateCountdown();
  const diagnostic = s.diagnostics;
  const hasDiagnostic = diagnostic && diagnostic.category && diagnostic.category !== 'none';
  const showError = !!hasDiagnostic || (!diagnostic && !!s.last_error);
  visible('error-box', showError);
  if (showError) {
    text('error-summary', diagnostic?.reason || '本轮暂时无法继续，请查看详情并处理对应条件。');
    text('error-suggestion', diagnostic?.suggestion || '');
    text('error-detail', s.last_error || '调度器未提供更多错误详情。');
  }
  visible('task-details', !!task?.body);
  if (task?.body !== lastBody) { renderMarkdown($('task-body'), task?.body || ''); lastBody = task?.body; }
  text('task-attempt', task?.recovery?.status ? `恢复状态：${{pending:'等待恢复', applying:'正在恢复', applied:'成果已恢复', completed:'恢复完成'}[task.recovery.status] || '等待调度器报告'}` : task?.attempt ? `已完成 ${task.attempt} 轮实现检查` : s.phase === 'develop' ? '当前为第 1 轮开发' : '尚未开始开发');
  text('state-updated', s.updated_at ? `进度记录于 ${date(s.updated_at)}` : '尚无进度记录');
  renderControls(s); renderBlockers(s); renderResearch(s); renderProgress(s); acceptQuota(s.quota); renderQuota(); renderRoles(s); renderActivity(s); renderHistory(s); renderDiagnostics(s.diagnostics);
  text('history-count', s.history.length); text('completed-count', s.counts ? `已验收 ${s.counts.accepted} · 已暂缓 ${s.counts.deferred}` : `已归档 ${s.cycle} 项任务`);
  text('service-state', s.runner_online ? '调度器在线' : '调度器离线'); $('service-led').classList.toggle('online', s.runner_online);
  if (pendingId) {
    const applied = s.controls.find(x => x.id === pendingId);
    if (applied) { feedback(applied.message, applied.status === 'rejected'); pendingId = null; }
  }
}

function quotaWaitNext(s, quota) {
  if (s.quota_wait_scope === 'github') return s.next_run_at
    ? `${countdown(s.next_run_at)}后复查 GitHub 限流，计划时间 ${date(s.next_run_at)}。`.replace('即将检查后', '即将')
    : '等待调度器报告 GitHub 限流复查时间。';
  if (quota?.checking || quotaRequesting) return '正在同步额度，等待查询结果。';
  if (quota?.allowed === true && !quota.stale && !quota.error) return '额度已允许使用，等待调度器确认。';
  return quota?.next_check_at ? `下次额度同步计划于 ${date(quota.next_check_at)}。` : '定期同步额度，等待下次检查时间。';
}
function updateCountdown() {
  $('clock').textContent = date(Date.now()/1000);
  if (!state) return;
  const s = state;
  let next;
  if (!s.runner_online) next = `启动调度服务后，从“${phaseName(s.phase)}”阶段继续。`;
  else if (s.paused) next = `恢复后从“${phaseName(s.phase)}”阶段继续，已有任务和工作文件会保留。`;
  else if (s.status === 'waiting:quota') next = quotaWaitNext(s, quotaData);
  else if (s.next_run_at) next = `${countdown(s.next_run_at)}后${s.status === 'waiting:quota' ? '复查可用额度' : '继续检查执行条件'}，计划时间 ${date(s.next_run_at)}。`;
  else if (s.status === 'waiting:research') next = s.blockers?.length ? '查看暂缓任务的恢复条件，或等待下一次复查。' : '等待下一轮定期研究。';
  else next = {recover:'恢复保存的工作并诊断阻塞原因。', plan: '形成明确的任务范围与验收标准，随后发布 GitHub Issue。', publish: '任务发布成功后，交给开发者开始实现。', develop: '完成实现后，运行检查并提交到 auto_coding。', validate: '验证通过并推送代码后，交给产品经理独立验收。', review: '逐项核对验收标准，通过后关闭 Issue；需要改进时返回开发。', accept: '保存本轮结果，开始下一轮产品研究。'}[s.phase] || '继续处理当前任务。';
  text('next-step', next.replace('即将检查后', '即将'));
}

let feedbackTimer;
function feedback(message, error=false) { clearTimeout(feedbackTimer); text('control-feedback', message); $('control-feedback').classList.toggle('error', error); visible('control-feedback', true); if (!error) feedbackTimer = setTimeout(() => visible('control-feedback', false), 5000); }
function renderControls(s) {
  const primary = $('primary-action');
  if (!s.runner_online) { primary.dataset.action = 'start'; primary.textContent = '启动调度服务'; text('control-description', '调度服务当前不在线。启动后可从已保存的位置继续。'); }
  else if (s.paused) { primary.dataset.action = 'resume'; primary.textContent = '恢复运行'; text('control-description', '任务与工作文件已保留，恢复后继续当前阶段。'); }
  else { primary.dataset.action = 'pause'; primary.textContent = '暂停流程'; text('control-description', s.status === 'waiting:quota' ? '正在等待账户额度恢复。你也可以暂停整个流程。' : '流程会自动推进。暂停时会保存当前阶段和已有工作。'); }
  primary.disabled = busy || (s.runner_online && s.pending_controls > 0);
  const retry = ['waiting:retry', 'waiting:startup', 'waiting:research'].includes(s.status) && !s.paused && s.runner_online;
  visible('retry-action', retry); $('retry-action').disabled = busy || s.pending_controls > 0; $('retry-action').dataset.action = 'retry';
  text('control-hint', s.pending_controls ? '正在等待调度器确认操作，请稍候。' : '短暂进行中的网络或 Git 操作可能先完成。');
}


let blockerSignature = null, researchBody = null;
function renderBlockers(s) {
  const blockers = Array.isArray(s.blockers) ? s.blockers : [];
  visible('blocker-section', blockers.length > 0);
  const signature = JSON.stringify([blockers, s.recovery_allowed, s.pending_controls, s.runner_online, s.status, s.active, s.task?.id, busy]);
  if (signature === blockerSignature) return; blockerSignature = signature;
  const list = $('blocker-list'); list.replaceChildren();
  for (const task of blockers) {
    const row = element('article','blocker-item');
    const header = element('div','blocker-header'), heading = element('div');
    heading.append(element('h3','',task.title || '未命名任务'), element('p','blocker-meta', [task.issue_number ? `Issue #${task.issue_number}` : '', task.archived_at ? `暂缓于 ${date(task.archived_at)}` : '', task.saved_work ? '已保存工作' : '未报告已保存工作'].filter(Boolean).join(' · ')));
    const button = element('button','button primary','恢复并诊断'); button.dataset.action='recover'; button.dataset.taskId=task.id || '';
    button.disabled = !s.recovery_allowed || !task.recoverable || !task.id || busy || !!s.pending_controls;
    header.append(heading,button); row.append(header);
    const reason = task.review?.summary || task.feedback;
    if (reason) row.append(element('p','blocker-reason',reason));
    if (task.recovery_reason) row.append(element('p','blocker-meta',`成果快照：${task.recovery_reason}`));
    const failed = (task.validation?.checks || []).filter(check => check.exit_code != null && check.exit_code !== 0);
    if (task.review?.feedback || failed.length) {
      const details = element('details','blocker-details');
      details.append(element('summary','','恢复条件与失败检查'));
      if (task.review?.feedback) details.append(element('p','',task.review.feedback));
      for (const check of failed) {
        const entry = element('div','failed-check');
        entry.append(element('strong','',check.command || '检查命令未报告'));
        const result = check.result || check.reason || `退出码 ${check.exit_code}`;
        entry.append(element('pre','',typeof result === 'string' ? result : JSON.stringify(result)));
        details.append(entry);
      }
      row.append(details);
    }
    if (button.disabled) {
      const active = !!s.task || !!s.active?.phase || !!s.active?.thread_id;
      const note = busy || s.pending_controls ? '正在处理控制请求，请稍候。'
        : !s.runner_online ? '请先启动调度服务。'
        : active ? '请等待当前任务结束。'
        : s.status === 'waiting:quota' ? '等待额度恢复后再试。'
        : !task.id ? '调度器未提供任务标识。'
        : !task.recoverable ? (task.recovery_reason || '此任务当前不具备恢复条件。')
        : '请等待流程进入可恢复状态。';
      row.append(element('p','blocker-note',note));
    }
    list.append(row);
  }
}
function renderResearch(s) {
  const r=s.research; visible('research-section', !!r && !s.task);
  if (!r) return;
  text('research-title',r.title || '调度器未报告标题'); text('research-summary',r.summary || '调度器未报告决策摘要。');
  text('research-meta',[r.issue_number ? `Issue #${r.issue_number}` : '', r.at ? `记录于 ${date(r.at)}` : '', r.wait_count != null ? `等待 ${r.wait_count} 次` : '', s.status === 'waiting:research' && s.next_run_at ? `下次复查 ${date(s.next_run_at)}` : ''].filter(Boolean).join(' · '));
  visible('research-details', !!r.body); if (r.body !== researchBody) { renderMarkdown($('research-body'), r.body || ''); researchBody = r.body; }
}
function duration(seconds) { if (seconds == null) return null; seconds = Math.max(0, Math.floor(seconds)); return seconds >= 3600 ? `${Math.floor(seconds/3600)} 小时 ${Math.floor(seconds%3600/60)} 分钟` : seconds >= 60 ? `${Math.floor(seconds/60)} 分钟` : `${seconds} 秒`; }
function renderProgress(s) {
  const p=s.progress; if (!p) { visible('progress-warning', false); return text('progress-summary','等待调度器报告进展'); }
  const parts=[]; if (p.last_activity_at) parts.push(`最近活动 ${date(p.last_activity_at)}`);
  if (p.elapsed_seconds != null) parts.push(`本轮已持续 ${duration(p.elapsed_seconds)}`);
  if (p.quiet_seconds != null) parts.push(`${p.quiet ? '暂无新活动' : '距上次活动'} ${duration(p.quiet_seconds)}`);
  text('progress-summary',parts.join(' · ') || '调度器尚未报告活动时间');
  const active = s.active || {}, error = active.last_transport_error;
  const running = s.runner_online && !s.paused && s.status.startsWith('running:');
  const timeout = active.protocol_idle_timeout_seconds;
  const quiet = p.quiet_seconds != null && p.quiet;
  let warning = '';
  if (running && error && error.will_retry === true) warning = `模型连接中断，正在尝试重连。${error.message || ''}`;
  else if (running && error) warning = `模型连接出现问题${error.will_retry === false ? '，未报告将重连' : '，重连状态未知'}。${error.message || ''}`;
  else if (running && quiet) warning = timeout
    ? `本轮已有 ${duration(p.quiet_seconds)} 未收到活动；达到 ${duration(timeout)} 无响应阈值后，调度器会保留进度并安排重试。`
    : `本轮已有 ${duration(p.quiet_seconds)} 未收到活动，等待调度器报告后续状态。`;
  else if (!running && quiet) warning = `上次记录后已有 ${duration(p.quiet_seconds)} 未收到活动。当前流程未处于运行状态。`;
  if (running && error && timeout) warning += `${quiet ? ` 已有 ${duration(p.quiet_seconds)} 无活动。` : ''} 连续 ${duration(timeout)} 无响应后将保留进度并重试。`;
  text('progress-warning',warning); visible('progress-warning',!!warning);
}

let quotaData = null, quotaController = null, quotaTimer = null, quotaGeneration = 0, quotaRequesting = false;
function quotaTime(value) {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  const parsed = Date.parse(value); return Number.isFinite(parsed) ? parsed / 1000 : 0;
}
function acceptQuota(incoming, forcedStart=false) {
  if (!incoming || typeof incoming !== 'object') return;
  if (!quotaData) { quotaData = incoming; return; }
  const oldChecked = quotaTime(quotaData.checked_at), newChecked = quotaTime(incoming.checked_at);
  const oldAttempt = quotaTime(quotaData.last_attempt_at), newAttempt = quotaTime(incoming.last_attempt_at);
  if (newChecked > oldChecked || newAttempt > oldAttempt) {
    quotaData = newChecked < oldChecked
      ? {...incoming, primary:quotaData.primary, secondary:quotaData.secondary, allowed:quotaData.allowed, checked_at:quotaData.checked_at}
      : incoming;
  } else if (newChecked === oldChecked && newAttempt === oldAttempt) {
    // Once an attempt reaches a terminal state, a late checking response cannot restart it.
    if (quotaData.checking === false && incoming.checking === true && !forcedStart) return;
    quotaData = {...quotaData, ...incoming};
  }
}
function renderQuota() {
  const q = quotaData || {}, container = $('quota'); container.replaceChildren();
  const sync = $('quota-sync'); sync.disabled = quotaRequesting || !!q.checking;
  sync.textContent = quotaRequesting || q.checking ? '同步中…' : '同步额度';
  for (const [key, fallback] of [['primary', '短期额度'], ['secondary', '周期额度']]) {
    const window = q[key], value = typeof window?.usedPercent === 'number' && Number.isFinite(window.usedPercent) ? window.usedPercent : null;
    const expired = !!window?.resetsAt && window.resetsAt * 1000 <= Date.now();
    const stale = !!q.stale || !!q.error || expired;
    const title = window?.windowDurationMins === 300 ? '5 小时额度' : window?.windowDurationMins === 10080 ? '每周额度' : fallback;
    const box = element('div', 'quota-item' + (value >= 100 && !stale ? ' exhausted' : '') + (stale ? ' stale' : ''));
    const row = element('div', 'quota-row'); row.append(element('span', '', title), element('strong', '', value == null ? '暂无数据' : `已用 ${value}%`));
    const progress = element('progress'); progress.max = 100; if (value != null) progress.value = Math.min(100, Math.max(0, value));
    progress.setAttribute('aria-label', `${title}：${value == null ? '暂无数据' : `已用 ${value}%`}`);
    const remaining = value == null ? '剩余额度未知' : `剩余 ${Math.max(0, Math.min(100, 100-value))}%`;
    const reset = window?.resetsAt ? (expired ? `${date(window.resetsAt)} 已过重置时间，待复查` : `预计 ${date(window.resetsAt)} 重置`) : '重置时间未报告';
    box.append(row); if (value != null) box.append(progress); box.append(element('p', 'quota-reset', `${remaining} · ${reset}`)); container.append(box);
  }
  const status = q.checking || quotaRequesting ? '正在同步' : q.error ? `同步失败：${q.error}` : q.stale ? '数据过期，待同步' : q.checked_at ? '最近快照' : '暂无成功快照';
  text('quota-time', `${status}。来源：${q.source || 'Codex app-server'}。${q.checked_at ? `上次成功 ${date(q.checked_at)}。` : '尚无成功时间。'}${q.error && q.checked_at ? '显示上次数据，已标为过期。' : ''}`);
  if (state) updateCountdown();
}
function stopQuotaPolling() {
  quotaGeneration++; clearTimeout(quotaTimer); quotaTimer = null;
  if (quotaController) quotaController.abort(); quotaController = null; quotaRequesting = false;
}
function refreshQuota(force=false) {
  stopQuotaPolling(); const generation = quotaGeneration, deadline = Date.now() + 60000;
  async function read(refresh) {
    if (generation !== quotaGeneration) return;
    const controller = new AbortController(); quotaController = controller; quotaRequesting = true; renderQuota();
    const timeout = setTimeout(() => controller.abort(), Math.max(0, deadline-Date.now()));
    try {
      const response = await fetch('/api/quota' + (refresh ? '?refresh=1' : ''), {cache:'no-store', signal:controller.signal});
      if (!response.ok) throw new Error('无法读取额度');
      const data = await response.json(); if (generation !== quotaGeneration) return;
      acceptQuota(data, refresh && data.checking === true); quotaRequesting = false; renderQuota();
      if (quotaData?.checking && Date.now() < deadline) quotaTimer = setTimeout(() => read(false), 2000);
      else if (quotaData?.checking) { quotaData = {...quotaData, checking:false, stale:true, error:'同步超时，请重试'}; renderQuota(); }
    } catch (error) {
      if (generation !== quotaGeneration) return;
      quotaRequesting = false; quotaData = {...quotaData, checking:false, stale:true, error: error.name === 'AbortError' ? '同步超时，请重试' : '无法读取额度，请重试'}; renderQuota();
    } finally { clearTimeout(timeout); if (quotaController === controller) quotaController = null; }
  }
  read(force);
}

function renderRoles(s) {
  const team = s.team || {}, active = s.active || {};
  const renderRole = (id, config, status, task) => {
    const row = $(id);
    row.querySelector('.role-model').textContent = config?.model
      ? `${config.model}${config.reasoning_effort ? ` · ${config.reasoning_effort}` : ''}（配置）`
      : '等待调度器报告';
    row.querySelector('.role-state').textContent = status;
    row.querySelector('.role-task').textContent = task ? `子任务：${task.slice(0, 120)}` : '';
    row.classList.toggle('current', status === '执行中');
  };
  const commanderStatus = !team.commander?.model ? '等待调度器报告'
    : !s.runner_online ? '待恢复' : s.paused ? '已暂停' : s.status.startsWith('waiting:') ? '等待中'
    : active.model ? (active.model === team.commander.model && s.status.startsWith('running:') ? '执行中' : '待命') : '尚未开始';
  renderRole('role-astra', team.commander, commanderStatus, '');
  const statuses = {running:'执行中', in_progress:'执行中', completed:'已完成', complete:'已完成', failed:'出错', error:'出错', cancelled:'已结束', pending:'正在启动', queued:'等待执行', stopping:'正在结束'};
  for (const role of ['sol', 'terra']) {
    const config = team.workers?.find(x => x.role === role);
    const children = active.children;
    const child = Array.isArray(children) ? [...children].reverse().find(x => x.role === role) : null;
    const status = !config?.model || !Array.isArray(children) ? '等待调度器报告'
      : child ? (statuses[child.status] || '等待调度器报告') : '尚未派遣';
    renderRole(`role-${role}`, config, status, child?.task || '');
  }
  text('business-stage', `业务阶段：${phaseName(s.phase)} · ${roleName(s.phase)}`);
}

const eventTitles = {turn_started:'开始执行', quota_wait:'等待额度恢复', retry:'等待重试', startup_failure:'启动检查未通过', needs_attention:'需要处理', turn_failed:'本轮未完成', task_completed:'任务已验收', task_deferred:'任务已暂缓', research_wait:'进入定期研究', operator_control:'控制操作'};
function eventText(e) { return e.detail || e.summary || e.title || (e.phase ? `${roleName(e.phase)}开始${phaseName(e.phase)}。` : e.until ? `计划于 ${date(e.until)}重新检查。` : e.issue ? `Issue #${e.issue}` : '状态已记录。'); }
function renderActivity(s) {
  const messages = s.activity.filter(x => x.kind === 'message').slice(-3).reverse().map(x => ({title:`${roleName(s.active.phase || s.phase)}的已记录进展`, message:x.text}));
  const events = [...s.events].reverse().slice(0, Math.max(2, 5-messages.length)).map(x => ({title:(eventTitles[x.event] || '流程更新') + (x.count > 1 ? `（重复 ${x.count} 次）` : ''), message:eventText(x), at:x.last_at || x.at, first:x.count > 1 ? x.first_at : null}));
  const data = [...messages,...events]; const signature = JSON.stringify(data); if (signature === lastActivity) return; lastActivity = signature;
  $('activity').replaceChildren();
  if (!data.length) return $('activity').append(empty('运行记录即将出现在这里', '调度器开始工作后，会自动记录每个阶段的变化。'));
  for (const item of data) { const row = element('div','activity-entry'); const content = element('div'); content.append(element('strong','',item.title),element('p','',item.message)); if(item.at) content.append(element('time','',`记录于 ${date(item.at)}${item.first ? `，首次 ${date(item.first)}` : ''}`)); row.append(element('span','event-dot'),content); $('activity').append(row); }
}

function renderHistory(s) {
  text('history-counts', s.counts ? `已验收 ${s.counts.accepted} 项 · 已暂缓 ${s.counts.deferred} 项` : '等待调度器报告统计');
  const signature = JSON.stringify(s.history); if (lastHistory === signature) return; lastHistory = signature;
  $('history-list').replaceChildren();
  if (!s.history.length) return $('history-list').append(empty('还没有完成验收的任务', '当前任务完成或被暂缓后，会在这里留下交付和验收记录。', true));
  for (const task of s.history) {
    const details = element('details','history-item'), summary = element('summary','history-summary'), title = element('div');
    title.append(element('h3','',task.title)); const meta = element('div','history-meta'); meta.append(element('span','',task.issue_number ? `Issue #${task.issue_number}` : '未发布任务'), element('time','',date(task.recorded_at)), element('span','',`${task.attempt} 轮实现`)); title.append(meta);
    const verdict = task.review?.verdict; const accepted = verdict === 'accept'; summary.append(title,element('span','history-badge'+(!accepted?' deferred':''),accepted?'已验收':verdict === 'defer' ? '已暂缓' : '状态未报告'));
    const body = element('div','history-body'); body.append(element('p','',task.review.summary || task.development_summary));
    if(task.review.evidence.length){const list=element('ul');for(const e of task.review.evidence)list.append(element('li','',e));body.append(list);}
    if(task.validation?.checks?.length){const section=element('div','history-checks');section.append(element('strong','','实际检查'));for(const check of task.validation.checks){section.append(element('p','',`${check.exit_code === 0 ? '通过' : '未通过'} · ${check.command || '检查命令未报告'}`));}body.append(section);}
    if(task.delivery_sha){const p=element('p','','交付提交：');p.append(element('code','',task.delivery_sha.slice(0,12)));body.append(p);}
    if(task.url){const a=element('a','','在 GitHub 查看完整任务 ↗');a.href=task.url;a.target='_blank';a.rel='noopener noreferrer';body.append(a);}
    details.append(summary,body);$('history-list').append(details);
  }
}


function renderDiagnostics(d) {
  const labels = {auth:'后台身份验证需要处理',network:'网络连接需要处理',quota:'等待额度恢复',attention:'需要处理',none:'调度器未报告连接问题'};
  text('diagnostic-title', d ? (labels[d.category] || '调度器诊断') : '等待调度器报告');
  text('diagnostic-message', [d?.reason, d?.category === 'auth' ? '浏览器登录与后台凭据不同。' : ''].filter(Boolean).join(' '));
  text('diagnostic-suggestion', d?.suggestion || '');
  text('diagnostic-time', d?.updated_at ? `更新于 ${date(d.updated_at)}` : '');
}
let githubTimer = null, githubController = null, githubGeneration = 0;
function stopGithubPolling() {
  githubGeneration++; clearTimeout(githubTimer); githubTimer = null;
  if (githubController) githubController.abort();
  githubController = null;
}
function refreshGithub(force) {
  stopGithubPolling();
  const generation = githubGeneration, deadline = Date.now() + 60000;
  async function read(refresh) {
    if (generation !== githubGeneration || !['queue','connection'].includes(currentView)) return;
    const controller = new AbortController(); githubController = controller;
    const timeout = setTimeout(() => controller.abort(), Math.max(0, deadline - Date.now()));
    try {
      const response = await fetch('/api/github' + (refresh ? '?refresh=1' : ''), {cache:'no-store', signal:controller.signal});
      if (!response.ok) throw new Error();
      const data = await response.json();
      if (generation !== githubGeneration) return;
      renderGithub(data);
      if (data.checking) {
        if (Date.now() < deadline) githubTimer = setTimeout(() => read(false), 2000);
        else { text('github-status','检查仍在进行，请稍后重新检查'); text('queue-summary','检查仍在进行，请稍后重新检查连接。'); }
      }
    } catch (error) {
      if (generation !== githubGeneration) return;
      if (error.name === 'AbortError') { text('github-status','检查超时，请稍后重新检查'); text('queue-summary','检查超时，请稍后重新检查连接。'); return; }
      text('github-status','无法读取后台连接状态');
      text('queue-summary','无法读取任务队列，请重新检查连接。');
    } finally { clearTimeout(timeout); if (githubController === controller) githubController = null; }
  }
  read(force);
}
function renderGithub(data) {
  const labels = {unknown:'尚未检查',checking:'正在检查',connected:'连接正常',auth_error:'后台身份验证失败',network_error:'网络连接失败',forbidden:'后台权限不足'};
  text('github-status', data.checking ? '正在检查后台连接' : (labels[data.status] || '等待检查'));
  const authHint = data.status === 'auth_error' ? '浏览器登录与后台凭据不同。' : '';
  text('github-detail', [data.reason, authHint, data.suggestion].filter(Boolean).join(' '));
  const permissions = data.permissions;
  const permissionText = permissions ? ['pull','push','admin'].map(k => `${{pull:'读取',push:'推送',admin:'管理'}[k]}：${permissions[k] == null ? '未知' : permissions[k] ? '允许' : '未允许'}`).join('，') : '权限等待检查';
  text('github-time', `${data.checked_at ? `检查于 ${date(data.checked_at)}。` : '尚无检查时间。'} ${permissionText}`);
  const counts = data.issue_counts;
  const issues = Array.isArray(data.issues) ? data.issues : [];
  const connected = data.status === 'connected' && !data.checking;
  const checked = data.checked_at ? `检查于 ${date(data.checked_at)}。` : '检查时间未报告。';
  if (data.checking) {
    text('queue-summary', '正在检查连接（下方若有内容为上次快照）。');
  } else if (connected) {
    text('queue-summary', counts ? `最近 40 条 Issue 窗口：共 ${counts.total ?? '—'} 条，开放 ${counts.open ?? '—'}，关闭 ${counts.closed ?? '—'}。${checked}` : `连接正常，队列统计未报告。${checked}`);
  } else {
    const reason = [data.reason || labels[data.status] || '尚未检查连接', data.suggestion].filter(Boolean).join(' ');
    text('queue-summary', `${reason} ${issues.length ? '下方为上次任务快照。' : '连接成功后读取任务队列。'}`);
  }
  const list = $('queue-list'); list.replaceChildren();
  if (!issues.length) {
    list.append(empty(connected ? '最近的 Issue 窗口为空' : '暂无任务快照', connected ? '连接成功，最近的 Issue 窗口没有任务。' : '连接成功后读取任务队列。'));
    return;
  }
  for (const issue of issues) {
    const row = element('article','queue-item'), heading = element('div','queue-heading');
    const title = element('strong','',issue.title || '未命名任务');
    if (issue.url && /^https:\/\/github\.com\//.test(issue.url)) { const link = element('a','',issue.title || '未命名任务'); link.href=issue.url; link.target='_blank'; link.rel='noopener noreferrer'; heading.append(link); } else heading.append(title);
    heading.append(element('span','queue-state',issue.state === 'open' ? '开放' : issue.state === 'closed' ? '已关闭' : '状态未知'));
    row.append(heading, element('p','queue-meta',`#${issue.number}  ${issue.updated_at ? `更新于 ${date(issue.updated_at)}` : ''}`));
    if (Array.isArray(issue.labels) && issue.labels.length) { const labels = element('div','queue-labels'); for (const label of issue.labels) labels.append(element('span','',label)); row.append(labels); }
    list.append(row);
  }
}

async function refreshStatus() {
  if (fetching) return; fetching = true;
  try {
    const response = await fetch('/api/status', {cache:'no-store'}); if(!response.ok)throw new Error('status');
    render(await response.json()); visible('disconnect',false); $('connection').classList.add('online'); $('connection').querySelector('span').textContent='已连接';
    if(currentView==='logs') await refreshLogs();
  } catch (_) { visible('disconnect',true); $('connection').classList.remove('online'); $('connection').querySelector('span').textContent='正在重连'; }
  finally { fetching=false; }
}

async function control(action, taskId) {
  if(busy)return;busy=true;if(state){renderControls(state);renderBlockers(state);}
  try {
    const session=await fetch('/api/session',{cache:'no-store'});if(!session.ok)throw new Error('无法连接控制台，请刷新后重试。');
    const {token}=await session.json();
    const response=await fetch('/api/control',{method:'POST',headers:{'Content-Type':'application/json','X-Console-Token':token},body:JSON.stringify(action === 'recover' ? {action, task_id:taskId} : {action})});
    const data=await response.json();if(!response.ok)throw new Error(data.error || '操作未完成');
    pendingId=data.id;feedback(data.message);await refreshStatus();setTimeout(refreshStatus,1200);
  } catch(error){feedback(error.message,true);}
  finally{busy=false;if(state){renderControls(state);renderBlockers(state);}}
}

function showView(view) {
  if(!['overview','queue','history','logs','connection'].includes(view))return;stopGithubPolling();currentView=view;
  for(const name of ['overview','queue','history','logs','connection'])visible('view-'+name,name===view);
  document.querySelectorAll('.tab').forEach(button=>{const selected=button.dataset.view===view;button.classList.toggle('active',selected);if(selected)button.setAttribute('aria-current','page');else button.removeAttribute('aria-current');});
  if(view==='logs')refreshLogs();
  if(view==='queue'||view==='connection')refreshGithub(false);
}

function logRows() {
  return logData.map(e=>{
    if(logSource==='events')return{title:(eventTitles[e.event]||'流程更新') + (e.count > 1 ? `（重复 ${e.count} 次）` : ''),at:e.last_at || e.at,text:eventText(e) + (e.count > 1 && e.first_at ? `\n首次记录：${date(e.first_at)}` : ''),kind:'message'};
    if(logSource==='agent')return{title:e.kind==='command'?'执行命令':'角色进展',text:e.text,kind:e.kind};
    if(logSource==='checks')return{title:`${e.command} · ${e.exit_code===0?'通过':'未通过'}`,text:e.text};
    return{title:e.name,text:e.text};
  }).filter(e=>e.text).reverse().filter(e=>(e.title+' '+e.text).toLowerCase().includes($('log-search').value.trim().toLowerCase()));
}

function renderLogs() {
  const rows=logRows(),signature=JSON.stringify([logSource,rows]);if(signature===lastLogRender)return;lastLogRender=signature;
  $('log-list').replaceChildren();visibleLogText=rows.map(e=>`${e.at?date(e.at)+' ':''}${e.title}\n${e.text}`).join('\n\n');
  if(!rows.length){$('log-list').append(empty('这里暂时没有记录',$('log-search').value?'换一个关键词试试。':logSource==='checks'?'开发完成并运行验证后，会显示实际检查结果。':'这一类日志有新记录时会自动显示。'));return;}
  for(const row of rows){const el=element('div','log-entry'+(row.kind==='message'?' message':'')),content=element('div');content.append(element('strong','',row.title),element('pre','',row.text));el.append(element('time','',row.at?date(row.at):logSource==='agent'?'当前会话':'本轮记录'),content);$('log-list').append(el);}
}

async function refreshLogs() {
  const requestedSource=logSource;
  try{const r=await fetch('/api/logs?source='+requestedSource,{cache:'no-store'});if(!r.ok)throw new Error();const data=await r.json();if(logSource!==requestedSource)return;logData=data.entries;renderLogs();}
  catch(_){$('log-list').replaceChildren(empty('日志暂时无法读取','检查本地控制台连接，或点击刷新状态重试。'));}
}

document.addEventListener('click',event=>{const nav=event.target.closest('[data-view]');if(nav)showView(nav.dataset.view);const action=event.target.closest('[data-action]');if(action&&!action.disabled)control(action.dataset.action, action.dataset.taskId);const source=event.target.closest('[data-source]');if(source){logSource=source.dataset.source;document.querySelectorAll('[data-source]').forEach(b=>{b.classList.toggle('active',b===source);b.setAttribute('aria-pressed',String(b===source));});refreshLogs();}});
$('refresh').addEventListener('click',()=>{refreshStatus();refreshQuota(true);});
$('quota-sync').addEventListener('click',()=>refreshQuota(true));
window.addEventListener('pagehide',stopQuotaPolling);
window.addEventListener('pageshow',event=>{if(event.persisted)refreshQuota(false);});
document.querySelectorAll('.github-refresh').forEach(button => button.addEventListener('click', () => refreshGithub(true)));
$('log-search').addEventListener('input',renderLogs);
$('copy-logs').addEventListener('click',async()=>{if(!visibleLogText)return toast('当前没有可复制的日志。');try{await navigator.clipboard.writeText(visibleLogText);toast('日志已复制。');}catch(_){toast('浏览器未允许复制，可选中日志手动复制。');}});
refreshStatus();refreshQuota(false);updateCountdown();setInterval(refreshStatus,5000);setInterval(updateCountdown,1000);
