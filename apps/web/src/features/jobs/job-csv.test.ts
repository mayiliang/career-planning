import { describe, expect, it } from 'vitest';
import { parseJobCsv } from './job-csv';

describe('岗位 CSV 解析', () => {
  it('支持中文表头、引号逗号和多行备注', () => {
    const parsed = parseJobCsv('公司,岗位,平台,备注\r\n示例科技,前端工程师,官网,"React, Vue\n均需掌握"');
    expect(parsed.errors).toEqual([]);
    expect(parsed.rows).toEqual([{
      company: '示例科技', job_title: '前端工程师', platform: '官网', notes: 'React, Vue\n均需掌握',
    }]);
  });

  it('拒绝缺少必需表头和未加引号的多余逗号', () => {
    const missing = parseJobCsv('company,platform\n示例科技,官网');
    expect(missing.errors.map((issue) => issue.message)).toContain('缺少必需列 job_title。');

    const malformed = parseJobCsv('company,job_title,platform\n示例科技,前端,高级,官网');
    expect(malformed.errors[0]?.row).toBe(2);
  });
});
