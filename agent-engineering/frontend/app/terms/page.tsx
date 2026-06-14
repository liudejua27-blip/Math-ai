const terms = [
  {
    title: "产品定位",
    body: "Math-SEARAG 是高中数学思维诊断与训练工具，重点帮助学生识别第一错步、理解错因、完成订正和变式迁移。它不是考试作弊工具，也不承诺替代教师或学校教学。",
  },
  {
    title: "学生使用规则",
    body: "学生应优先提交自己的解题步骤。没有步骤时，系统会先追问思路，不直接绕过学习过程给完整答案。请不要上传与学习无关的个人敏感信息或他人资料。",
  },
  {
    title: "AI 输出边界",
    body: "AI 诊断可能出现低置信或未验证状态。涉及高风险、竞赛证明、复杂几何或 OCR 低置信内容时，应以教师复核或人工确认结果为准。",
  },
  {
    title: "公开免费版限制",
    body: "公开免费阶段会设置上传大小、诊断频次和异常请求限制，以保证服务稳定和成本可控。滥用、批量抓取、攻击或绕过限制的账号可能被暂停。",
  },
  {
    title: "数据处理",
    body: "用户可以导出或删除自己的学习数据。草稿纸图片、OCR crop、学习画像和诊断历史属于敏感学习数据，生产环境必须使用私有存储和脱敏日志。",
  },
];

export default function TermsPage() {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-3xl flex-col gap-8 px-6 py-12">
      <header className="space-y-3">
        <p className="font-medium text-muted-foreground text-sm">
          Math-SEARAG Learning Agent
        </p>
        <h1 className="font-semibold text-3xl tracking-tight">用户协议摘要</h1>
        <p className="text-muted-foreground leading-7">
          这是公开免费版上线前的产品内协议摘要。正式发布前应补充完整公司主体、
          联系方式、争议处理、数据保存期限和法律审阅版本。
        </p>
      </header>

      {terms.map((item) => (
        <section className="space-y-2" key={item.title}>
          <h2 className="font-semibold text-xl">{item.title}</h2>
          <p className="text-muted-foreground leading-7">{item.body}</p>
        </section>
      ))}
    </main>
  );
}
