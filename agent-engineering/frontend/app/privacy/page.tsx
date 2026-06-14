const sections = [
  {
    title: "我们会处理哪些数据",
    items: [
      "账号信息：邮箱、匿名访客标识、登录状态。",
      "学习内容：题目、学生步骤、对话消息、诊断结果、错因原子、订正记录、变式结果。",
      "草稿纸图片：上传图片、OCR 结果、低置信识别项、学生确认和修改记录。",
      "运行数据：请求时间、错误摘要、限流状态、服务健康状态和脱敏后的 Agent 运行事件。",
    ],
  },
  {
    title: "数据用途",
    items: [
      "完成 OCR、首错定位、VerifierTrace、多解法推荐、函数图上讲解、Geometry Lab 推荐。",
      "生成学习画像、诊断历史、周报和下一步训练计划。",
      "改进 OCR-to-diagnosis 评测集，但公开报告只使用脱敏汇总数据。",
      "排查服务故障、识别滥用和控制免费公开服务成本。",
    ],
  },
  {
    title: "未成年人提示",
    items: [
      "本产品面向高中数学学习场景。未成年人使用前，应由监护人阅读并同意本政策。",
      "请不要上传身份证、住址、电话、学校证件等与数学学习无关的个人敏感信息。",
      "如监护人要求导出或删除相关数据，可通过产品内数据接口或运营联系方式处理。",
    ],
  },
  {
    title: "你的控制权",
    items: [
      "可通过 /api/privacy/export 导出当前账号下的学习数据。",
      "可通过 /api/privacy/delete 删除账号、聊天、诊断、学习画像和 OCR 样本记录。",
      "草稿纸图片应存放在私有对象存储；删除数据库记录后，生产环境需要同时触发 OSS 对象删除流程。",
    ],
  },
];

export default function PrivacyPage() {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-3xl flex-col gap-8 px-6 py-12">
      <header className="space-y-3">
        <p className="font-medium text-muted-foreground text-sm">
          Math-SEARAG Learning Agent
        </p>
        <h1 className="font-semibold text-3xl tracking-tight">隐私政策摘要</h1>
        <p className="text-muted-foreground leading-7">
          这是正式上线前的产品内隐私说明草案，用于明确学生题目、草稿纸图片、
          OCR 结果和学习画像的处理边界。正式公开发布前仍需完成法律审阅和备案材料。
        </p>
      </header>

      {sections.map((section) => (
        <section className="space-y-3" key={section.title}>
          <h2 className="font-semibold text-xl">{section.title}</h2>
          <ul className="list-disc space-y-2 pl-5 text-muted-foreground leading-7">
            {section.items.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </section>
      ))}
    </main>
  );
}
