<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, ref, useId, watch } from 'vue';

const props = withDefaults(defineProps<{
  open: boolean;
  eyebrow?: string;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: 'primary' | 'danger';
  busy?: boolean;
  confirmDisabled?: boolean;
}>(), {
  eyebrow: 'CONFIRM ACTION', description: '', confirmLabel: '确认', cancelLabel: '取消',
  tone: 'primary', busy: false, confirmDisabled: false,
});
const emit = defineEmits<{ confirm: []; cancel: [] }>();
const panel = ref<HTMLElement | null>(null);
const titleId = `${useId()}-title`;
const descriptionId = `${useId()}-description`;
let previousFocus: HTMLElement | null = null;
let previousBodyOverflow = '';

function focusableElements() {
  return Array.from(panel.value?.querySelectorAll<HTMLElement>(
    'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])',
  ) ?? []).filter((element) => element.getClientRects().length > 0);
}

function onKeydown(event: KeyboardEvent) {
  if (!props.open) return;
  if (event.key === 'Escape' && !props.busy) { event.preventDefault(); emit('cancel'); return; }
  if (event.key !== 'Tab') return;
  const elements = focusableElements();
  if (elements.length === 0) { event.preventDefault(); panel.value?.focus(); return; }
  const first = elements[0]!;
  const last = elements.at(-1)!;
  if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
  else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
}

watch(() => props.open, async (open) => {
  if (open) {
    previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    previousBodyOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    await nextTick();
    const preferred = panel.value?.querySelector<HTMLElement>('[autofocus], input:not([disabled]), textarea:not([disabled]), select:not([disabled])');
    (preferred ?? focusableElements()[0] ?? panel.value)?.focus();
    return;
  }
  document.body.style.overflow = previousBodyOverflow;
  previousFocus?.focus();
  previousFocus = null;
});

onMounted(() => window.addEventListener('keydown', onKeydown));
onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKeydown);
  if (props.open) document.body.style.overflow = previousBodyOverflow;
  previousFocus?.focus();
});
</script>

<template>
  <Teleport to="body">
    <Transition name="dialog-pop">
      <div v-if="open" class="dialog-scrim" @click.self="!busy && emit('cancel')">
        <section ref="panel" class="dialog-panel" role="dialog" aria-modal="true" :aria-labelledby="titleId" :aria-describedby="description ? descriptionId : undefined" tabindex="-1">
          <header>
            <div class="dialog-symbol" :data-tone="tone">{{ tone === 'danger' ? '!' : '✓' }}</div>
            <div><p>{{ eyebrow }}</p><h2 :id="titleId">{{ title }}</h2><span v-if="description" :id="descriptionId">{{ description }}</span></div>
            <button class="dialog-close" :disabled="busy" aria-label="关闭" @click="emit('cancel')">×</button>
          </header>
          <div v-if="$slots.default" class="dialog-content"><slot /></div>
          <footer>
            <button class="dialog-cancel" :disabled="busy" @click="emit('cancel')">{{ cancelLabel }}</button>
            <button class="dialog-confirm" :data-tone="tone" :disabled="busy || confirmDisabled" @click="emit('confirm')">
              {{ busy ? '正在处理…' : confirmLabel }}
            </button>
          </footer>
        </section>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.dialog-scrim{position:fixed;inset:0;z-index:1000;display:grid;place-items:center;padding:24px;background:rgba(9,18,32,.56);backdrop-filter:blur(14px) saturate(115%)}
.dialog-panel{width:min(540px,100%);overflow:hidden;background:rgba(255,255,255,.98);border:1px solid rgba(255,255,255,.82);border-radius:24px;box-shadow:0 30px 90px rgba(13,28,52,.3),0 0 0 1px rgba(29,63,119,.08)}
.dialog-panel:focus{outline:none}
.dialog-panel>header{display:grid;grid-template-columns:48px 1fr 36px;gap:14px;align-items:start;padding:24px 24px 19px;background:linear-gradient(145deg,#f8fbff,#fff)}
.dialog-symbol{display:grid;place-items:center;width:46px;height:46px;color:#fff;font-weight:850;background:linear-gradient(145deg,#3e76dc,#2456b5);border-radius:15px;box-shadow:0 10px 24px rgba(47,99,191,.24)}
.dialog-symbol[data-tone=danger]{background:linear-gradient(145deg,#dc6a62,#b84345);box-shadow:0 10px 24px rgba(185,67,69,.23)}
.dialog-panel p{margin:2px 0 5px;color:#5271aa;font:760 .65rem var(--font-mono);letter-spacing:.14em}.dialog-panel h2{margin:0;color:#172439;font-size:1.35rem;line-height:1.3}.dialog-panel header span{display:block;margin-top:7px;color:#647184;font-size:.84rem;line-height:1.65}
.dialog-close{display:grid;place-items:center;width:34px;height:34px;padding:0;color:#758195;font-size:1.35rem;background:#fff;border:1px solid #e3e8ef;border-radius:11px;cursor:pointer}.dialog-close:hover{color:#1c2d47;background:#f3f6fa}
.dialog-content{padding:0 24px 22px}.dialog-content :deep(textarea),.dialog-content :deep(input){width:100%;padding:12px 14px;background:#f8fafc;border:1px solid #d6dee8;border-radius:13px;outline:none}.dialog-content :deep(textarea){min-height:110px;resize:vertical}.dialog-content :deep(textarea:focus),.dialog-content :deep(input:focus){border-color:#5b83cf;box-shadow:0 0 0 4px rgba(67,112,199,.12)}
.dialog-panel>footer{display:flex;justify-content:flex-end;gap:10px;padding:17px 24px;background:#f7f9fc;border-top:1px solid #e7ebf1}.dialog-panel footer button{min-height:44px;padding:0 18px;font-weight:720;border-radius:12px;cursor:pointer}.dialog-cancel{color:#455368;background:#fff;border:1px solid #d7dee8}.dialog-confirm{color:#fff;background:linear-gradient(135deg,#356bcc,#244f9f);border:0;box-shadow:0 8px 20px rgba(44,91,178,.2)}.dialog-confirm[data-tone=danger]{background:linear-gradient(135deg,#cc5a56,#ab383e);box-shadow:0 8px 20px rgba(177,54,61,.2)}.dialog-panel button:disabled{opacity:.52;cursor:wait}
.dialog-pop-enter-active,.dialog-pop-leave-active{transition:opacity .2s ease}.dialog-pop-enter-active .dialog-panel,.dialog-pop-leave-active .dialog-panel{transition:transform .24s cubic-bezier(.2,.9,.2,1),opacity .2s ease}.dialog-pop-enter-from,.dialog-pop-leave-to{opacity:0}.dialog-pop-enter-from .dialog-panel,.dialog-pop-leave-to .dialog-panel{opacity:0;transform:translateY(16px) scale(.97)}
@media(max-width:560px){.dialog-scrim{align-items:end;padding:10px}.dialog-panel{border-radius:22px}.dialog-panel>header{grid-template-columns:42px 1fr 32px;padding:20px 18px 16px}.dialog-symbol{width:40px;height:40px}.dialog-content{padding:0 18px 18px}.dialog-panel>footer{padding:14px 18px}.dialog-panel footer button{flex:1}}
</style>
