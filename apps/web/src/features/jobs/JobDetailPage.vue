<script setup lang="ts">
/**
 * 岗位详情页面
 * 
 * Phase 6 实现：岗位信息、求职活动时间线、技能缺口管理
 */
import { ref, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { apiClient, type JobDetailResponse } from '../../api/client';

const route = useRoute();
const router = useRouter();
const jobId = route.params.id as string;

// 数据
const detail = ref<JobDetailResponse | null>(null);
const loading = ref(true);
const error = ref<string | null>(null);

// 活动表单
const showActivityForm = ref(false);
const activityForm = ref({
  activityType: 'MESSAGE' as 'APPLICATION' | 'MESSAGE' | 'WRITTEN_TEST' | 'INTERVIEW' | 'FOLLOW_UP' | 'OFFER' | 'REJECTION',
  title: '',
  description: '',
  scheduledAt: '',
  interviewRound: 1,
  interviewType: '' as '' | 'PHONE' | 'VIDEO' | 'ONSITE',
});

// 技能缺口表单
const showGapForm = ref(false);
const gapForm = ref({
  knowledgePointCode: '',
  gapLevel: 'MEDIUM' as 'HIGH' | 'MEDIUM' | 'LOW',
  sourceType: 'JD_ANALYSIS' as 'JD_ANALYSIS' | 'INTERVIEW_FEEDBACK' | 'SELF_ASSESSMENT',
  learningAction: '',
});

// 加载数据
async function loadDetail() {
  loading.value = true;
  error.value = null;
  
  try {
    detail.value = await apiClient.getJobDetail(jobId);
  } catch (e) {
    error.value = e instanceof Error ? e.message : '加载失败';
  } finally {
    loading.value = false;
  }
}

// 状态标签颜色
const statusColors: Record<string, string> = {
  SAVED: '#8E8E93',
  TO_APPLY: '#FF9500',
  APPLIED: '#007AFF',
  CONTACTING: '#5856D6',
  ASSESSMENT: '#FF2D55',
  INTERVIEWING: '#34C759',
  OFFER: '#00C7BE',
  REJECTED: '#FF3B30',
  WITHDRAWN: '#8E8E93',
};

// 活动类型标签
const activityTypeLabels: Record<string, string> = {
  APPLICATION: '投递',
  MESSAGE: '消息',
  WRITTEN_TEST: '笔试',
  INTERVIEW: '面试',
  FOLLOW_UP: '跟进',
  OFFER: 'Offer',
  REJECTION: '拒信',
};

// 创建活动
async function createActivity() {
  if (!activityForm.value.title) return;
  
  try {
    await apiClient.createJobActivity(jobId, {
      activityType: activityForm.value.activityType,
      title: activityForm.value.title,
      description: activityForm.value.description || undefined,
      scheduledAt: activityForm.value.scheduledAt || undefined,
      interviewRound: activityForm.value.interviewRound || undefined,
      interviewType: activityForm.value.interviewType || undefined,
    });
    
    showActivityForm.value = false;
    activityForm.value = {
      activityType: 'MESSAGE',
      title: '',
      description: '',
      scheduledAt: '',
      interviewRound: 1,
      interviewType: '',
    };
    
    await loadDetail();
  } catch (e) {
    alert('创建失败: ' + (e instanceof Error ? e.message : '未知错误'));
  }
}

// 创建技能缺口
async function createGap() {
  if (!gapForm.value.knowledgePointCode) return;
  
  try {
    await apiClient.createSkillGap(jobId, {
      knowledgePointCode: gapForm.value.knowledgePointCode,
      gapLevel: gapForm.value.gapLevel,
      sourceType: gapForm.value.sourceType,
      learningAction: gapForm.value.learningAction || undefined,
    });
    
    showGapForm.value = false;
    gapForm.value = {
      knowledgePointCode: '',
      gapLevel: 'MEDIUM',
      sourceType: 'JD_ANALYSIS',
      learningAction: '',
    };
    
    await loadDetail();
  } catch (e) {
    alert('创建失败: ' + (e instanceof Error ? e.message : '未知错误'));
  }
}

// 更新技能缺口状态
async function updateGapStatus(gapId: string, status: 'IDENTIFIED' | 'LEARNING' | 'MASTERED' | 'CLOSED') {
  try {
    await apiClient.updateSkillGapStatus(jobId, gapId, status);
    await loadDetail();
  } catch (e) {
    alert('更新失败: ' + (e instanceof Error ? e.message : '未知错误'));
  }
}

// 返回列表
function goBack() {
  router.push('/jobs');
}

onMounted(loadDetail);
</script>

<template>
  <div class="job-detail-page">
    <!-- 加载状态 -->
    <div v-if="loading" class="loading-state">加载中...</div>
    
    <!-- 错误状态 -->
    <div v-else-if="error" class="error-state">
      {{ error }}
      <button @click="loadDetail">重试</button>
    </div>
    
    <!-- 详情内容 -->
    <template v-else-if="detail">
      <!-- 头部 -->
      <header class="page-header">
        <button class="back-btn" @click="goBack">← 返回</button>
        <div class="job-header">
          <h2>{{ detail.job.jobTitle }}</h2>
          <div class="company">{{ detail.job.company }}</div>
          <div
            class="status-badge"
            :style="{ backgroundColor: statusColors[detail.job.status] }"
          >
            {{ detail.job.status }}
          </div>
        </div>
      </header>
      
      <!-- 基本信息 -->
      <section class="info-section">
        <div class="info-grid">
          <div class="info-item">
            <span class="label">平台</span>
            <span class="value">{{ detail.job.platform }}</span>
          </div>
          <div v-if="detail.job.salary" class="info-item">
            <span class="label">薪资</span>
            <span class="value salary">{{ detail.job.salary }}</span>
          </div>
          <div v-if="detail.job.experience" class="info-item">
            <span class="label">经验</span>
            <span class="value">{{ detail.job.experience }}</span>
          </div>
          <div v-if="detail.job.location" class="info-item">
            <span class="label">地点</span>
            <span class="value">{{ detail.job.location }}</span>
          </div>
        </div>
        
        <!-- 技术栈 -->
        <div v-if="detail.job.techStack?.length" class="tech-stack">
          <span class="label">技术栈</span>
          <div class="tags">
            <span v-for="tech in detail.job.techStack" :key="tech" class="tag">
              {{ tech }}
            </span>
          </div>
        </div>
        
        <!-- JD 关键词 -->
        <div v-if="detail.job.jdKeywords?.length" class="jd-keywords">
          <span class="label">关键词</span>
          <div class="tags">
            <span v-for="kw in detail.job.jdKeywords" :key="kw" class="tag secondary">
              {{ kw }}
            </span>
          </div>
        </div>
      </section>
      
      <!-- 下一步动作 -->
      <section v-if="detail.job.nextAction" class="next-action-section">
        <h3>下一步</h3>
        <div class="next-action-card">
          {{ detail.job.nextAction }}
          <span v-if="detail.job.nextActionDue" class="due">
            截止: {{ new Date(detail.job.nextActionDue).toLocaleDateString() }}
          </span>
        </div>
      </section>
      
      <!-- 技能缺口 -->
      <section class="skill-gaps-section">
        <div class="section-header">
          <h3>技能缺口</h3>
          <button class="add-btn" @click="showGapForm = true">+ 添加</button>
        </div>
        
        <div v-if="detail.skillGaps.length === 0" class="empty-hint">
          暂无技能缺口记录
        </div>
        
        <div v-else class="gap-list">
          <div v-for="gap in detail.skillGaps" :key="gap.id" class="gap-item">
            <div class="gap-header">
              <span class="gap-code">{{ gap.knowledgePointCode }}</span>
              <span :class="['gap-level', gap.gapLevel.toLowerCase()]">
                {{ gap.gapLevel }}
              </span>
            </div>
            <div class="gap-status">
              <select
                :value="gap.status"
                @change="(e) => updateGapStatus(gap.id, (e.target as HTMLSelectElement).value as any)"
              >
                <option value="IDENTIFIED">已识别</option>
                <option value="LEARNING">学习中</option>
                <option value="MASTERED">已掌握</option>
                <option value="CLOSED">已关闭</option>
              </select>
            </div>
            <div v-if="gap.learningAction" class="gap-action">
              行动: {{ gap.learningAction }}
            </div>
          </div>
        </div>
      </section>
      
      <!-- 求职活动时间线 -->
      <section class="activities-section">
        <div class="section-header">
          <h3>求职活动</h3>
          <button class="add-btn" @click="showActivityForm = true">+ 添加</button>
        </div>
        
        <div v-if="detail.activities.length === 0" class="empty-hint">
          暂无求职活动记录
        </div>
        
        <div v-else class="timeline">
          <div v-for="activity in detail.activities" :key="activity.id" class="timeline-item">
            <div class="timeline-marker" :class="activity.activityType.toLowerCase()">
              {{ activityTypeLabels[activity.activityType] }}
            </div>
            <div class="timeline-content">
              <div class="activity-title">{{ activity.title }}</div>
              <div v-if="activity.scheduledAt" class="activity-date">
                {{ new Date(activity.scheduledAt).toLocaleString() }}
              </div>
              <div v-if="activity.feedbackMd" class="activity-feedback">
                {{ activity.feedbackMd.slice(0, 100) }}...
              </div>
            </div>
          </div>
        </div>
      </section>
    </template>
    
    <!-- 添加活动对话框 -->
    <div v-if="showActivityForm" class="modal-overlay" @click.self="showActivityForm = false">
      <div class="modal">
        <h3>添加求职活动</h3>
        <form @submit.prevent="createActivity">
          <div class="form-group">
            <label>类型</label>
            <select v-model="activityForm.activityType">
              <option value="APPLICATION">投递</option>
              <option value="MESSAGE">消息</option>
              <option value="WRITTEN_TEST">笔试</option>
              <option value="INTERVIEW">面试</option>
              <option value="FOLLOW_UP">跟进</option>
              <option value="OFFER">Offer</option>
              <option value="REJECTION">拒信</option>
            </select>
          </div>
          <div class="form-group">
            <label>标题</label>
            <input v-model="activityForm.title" type="text" required />
          </div>
          <div class="form-group">
            <label>描述</label>
            <textarea v-model="activityForm.description" rows="3"></textarea>
          </div>
          <div v-if="activityForm.activityType === 'INTERVIEW'" class="form-row">
            <div class="form-group">
              <label>轮次</label>
              <input v-model.number="activityForm.interviewRound" type="number" min="1" />
            </div>
            <div class="form-group">
              <label>形式</label>
              <select v-model="activityForm.interviewType">
                <option value="">请选择</option>
                <option value="PHONE">电话</option>
                <option value="VIDEO">视频</option>
                <option value="ONSITE">现场</option>
              </select>
            </div>
          </div>
          <div class="form-actions">
            <button type="button" @click="showActivityForm = false">取消</button>
            <button type="submit" class="primary">保存</button>
          </div>
        </form>
      </div>
    </div>
    
    <!-- 添加技能缺口对话框 -->
    <div v-if="showGapForm" class="modal-overlay" @click.self="showGapForm = false">
      <div class="modal">
        <h3>添加技能缺口</h3>
        <form @submit.prevent="createGap">
          <div class="form-group">
            <label>知识点代码</label>
            <input v-model="gapForm.knowledgePointCode" type="text" required placeholder="如: 01-js-01" />
          </div>
          <div class="form-group">
            <label>缺口等级</label>
            <select v-model="gapForm.gapLevel">
              <option value="HIGH">高</option>
              <option value="MEDIUM">中</option>
              <option value="LOW">低</option>
            </select>
          </div>
          <div class="form-group">
            <label>来源</label>
            <select v-model="gapForm.sourceType">
              <option value="JD_ANALYSIS">JD 分析</option>
              <option value="INTERVIEW_FEEDBACK">面试反馈</option>
              <option value="SELF_ASSESSMENT">自我评估</option>
            </select>
          </div>
          <div class="form-group">
            <label>学习行动</label>
            <input v-model="gapForm.learningAction" type="text" />
          </div>
          <div class="form-actions">
            <button type="button" @click="showGapForm = false">取消</button>
            <button type="submit" class="primary">保存</button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<style src="./JobDetailPage.styles.css" scoped></style>
