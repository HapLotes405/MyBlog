import { PersonalInfo, BlogPost, User, Comment } from '@/types';

export const mockUser: User = {
  id: '1',
  username: 'zhangsan',
  email: 'zhangsan@example.com',
  nickname: '张三',
  avatar: '/images/avatar-placeholder.svg',
  bio: '全栈开发者，热爱开源与技术分享',
  createdAt: '2024-01-01',
};

export const mockPersonalInfo: PersonalInfo = {
  name: '张三',
  nickname: 'San Zhang',
  avatar: '/images/avatar-placeholder.svg',
  coverImage: '/images/cover-placeholder.svg',
  title: '全栈工程师 / 技术博主',
  bio: '热爱技术，喜欢探索前沿科技。从事 Web 开发 5 年，专注于 React、Node.js 和 Python 生态。工作之余喜欢骑行、摄影和阅读科幻小说。这个博客记录我的技术思考和生活点滴。',
  location: '中国 · 北京',
  socialLinks: [
    { platform: 'GitHub', url: 'https://github.com', icon: 'github' },
    { platform: 'Twitter', url: 'https://twitter.com', icon: 'twitter' },
    { platform: 'LinkedIn', url: 'https://linkedin.com', icon: 'linkedin' },
    { platform: '掘金', url: 'https://juejin.cn', icon: 'juejin' },
  ],
  skills: [
    'React', 'Next.js', 'TypeScript', 'Node.js', 'Python',
    'FastAPI', 'PostgreSQL', 'Docker', 'AWS', 'CI/CD',
  ],
  timeline: [
    {
      id: 't1',
      type: 'work',
      title: '高级前端工程师',
      organization: '某科技公司',
      description: '负责核心产品前端架构设计，主导组件库开发和性能优化。',
      startDate: '2023-03',
      endDate: null,
      current: true,
    },
    {
      id: 't2',
      type: 'work',
      title: '前端工程师',
      organization: '某互联网公司',
      description: '参与电商平台前端开发，使用 React + TypeScript 技术栈。',
      startDate: '2021-07',
      endDate: '2023-02',
      current: false,
    },
    {
      id: 't3',
      type: 'education',
      title: '计算机科学 本科',
      organization: '某大学',
      description: '主修计算机科学与技术，GPA 3.8/4.0，获优秀毕业生。',
      startDate: '2017-09',
      endDate: '2021-06',
      current: false,
    },
  ],
  interests: [
    { id: 'i1', name: '开源贡献', icon: 'code', description: '参与多个开源项目，GitHub 累计 500+ stars' },
    { id: 'i2', name: '技术写作', icon: 'pen', description: '坚持写技术博客，分享开发经验与最佳实践' },
    { id: 'i3', name: '骑行', icon: 'bike', description: '周末公路骑行，已完成 3 次百公里骑行' },
    { id: 'i4', name: '摄影', icon: 'camera', description: '喜欢风光和街拍摄影，偶尔修图' },
    { id: 'i5', name: '科幻阅读', icon: 'book', description: '《三体》《沙丘》《银河帝国》忠实读者' },
  ],
  photos: [],
};

export const mockPosts: BlogPost[] = [];

export const mockComments: Comment[] = [
  {
    id: 'c1',
    postId: 'p1',
    author: {
      ...mockUser,
      id: '2',
      username: 'lisi',
      avatar: '/images/avatar-placeholder.svg',
    },
    content: '写得太好了！正好我也在搭博客，这篇帮了大忙。',
    createdAt: '2026-05-22',
    likes: 5,
    parentId: null,
    replies: [
      {
        id: 'c1r1',
        postId: 'p1',
        author: mockUser,
        content: '谢谢支持！有问题随时交流。',
        createdAt: '2026-05-22',
        likes: 2,
        parentId: 'c1',
        replies: [],
      },
    ],
  },
  {
    id: 'c2',
    postId: 'p1',
    author: {
      ...mockUser,
      id: '3',
      username: 'wangwu',
      avatar: '/images/avatar-placeholder.svg',
    },
    content: '有没有考虑过用 MDX 代替 Markdown？可以直接在文章里嵌入 React 组件。',
    createdAt: '2026-05-23',
    likes: 3,
    parentId: null,
    replies: [],
  },
];
