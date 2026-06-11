import { ToolCard } from '@/components/layout/ToolCard'
import { CATEGORIES, getToolsByCategory } from '@/lib/tools-config'
import { Separator } from '@/components/ui/separator'

export function Home() {
  return (
    <main className="max-w-5xl mx-auto px-4 py-10">
      <div className="mb-10">
        <h1 className="text-3xl font-semibold tracking-tight mb-2">Tools</h1>
        <p className="text-muted-foreground text-sm">
          一组轻量的浏览器端工具，所有计算均在本地完成，不上传任何数据。
        </p>
      </div>

      <div className="space-y-10">
        {CATEGORIES.map((category) => {
          const tools = getToolsByCategory(category)
          if (tools.length === 0) return null
          return (
            <section key={category}>
              <div className="flex items-center gap-3 mb-4">
                <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                  {category}
                </h2>
                <Separator className="flex-1" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {tools.map((tool) => (
                  <ToolCard
                    key={tool.id}
                    title={tool.title}
                    description={tool.description}
                    href={tool.href}
                    icon={tool.icon}
                    category={tool.category}
                  />
                ))}
              </div>
            </section>
          )
        })}
      </div>
    </main>
  )
}
