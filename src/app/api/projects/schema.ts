import { z } from 'zod'

export const ProjectType = z.enum(['customer_acquisition', 'detail_page', 'video'])

export const ProjectCreateSchema = z.object({
  campaign_id: z.string().min(1, 'campaign_id is required'),
  type: ProjectType,
  step: z.number().int().min(1).max(10).default(1),
  // zod v4 일부 번들 환경에서 z.record(z.any()) 경로 이슈 대응: catchall로 대체
  data: z.object({}).catchall(z.any()).default({})
})

export const ProjectListQuerySchema = z.object({
  campaign_id: z.string().optional(),
  type: ProjectType.optional()
})

export const ProjectUpdateSchema = z
  .object({
    step: z.number().int().min(1).max(10).optional(),
    data: z.object({}).catchall(z.any()).optional(),
  })
  .strict()

export type ProjectTypeEnum = z.infer<typeof ProjectType>
export type ProjectCreateInput = z.infer<typeof ProjectCreateSchema>
export type ProjectListQuery = z.infer<typeof ProjectListQuerySchema>
export type ProjectUpdateInput = z.infer<typeof ProjectUpdateSchema>
