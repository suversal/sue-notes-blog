// next-env.d.ts 不进仓库，CI 里没有它；这里单独声明图片模块，类型检查才认得 `import avatar from './avatar.png'`。
declare module '*.png' {
  const content: import('next/dist/shared/lib/image-external').StaticImageData
  export default content
}
