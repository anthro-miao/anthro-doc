// @ts-check
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';

// https://astro.build/config
export default defineConfig({
	integrations: [
		starlight({
			title: 'Anthro Docs',
			locales: {
				root: {
					label: '简体中文',
					lang: 'zh-CN',
				},
			},
			social: [{ icon: 'github', label: 'GitHub', href: 'https://github.com/anthro-miao/anthro-doc' }],
			sidebar: [
				{
					label: '文档',
					items: [
						// Each item here is one entry in the navigation menu.
						{ label: '文档索引', slug: 'guides/content-index' },
						{ label: '华为云优惠券', slug: 'guides/huaweicloud-coupon' }
					],
				},
			],
		}),
	],
});
