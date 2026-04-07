export type RlhfModelRecord = {
  model_id: string
  version: string
  status: "pending" | "training" | "evaluating" | "approved" | "rejected" | "active"
  s3_artifact_path?: string | null
  training_job_arn?: string | null
  metrics?: RlhfModelMetrics | null
  train_records?: number
  train_split?: number
  val_split?: number
  created_at: string
  approved_at?: string | null
  approved_by?: string | null
}

export type RlhfModelMetrics = {
  accuracy: number
  avg_reward: number
  total_records: number
  positive_ratio: number
}

export type RlhfModelsListData = {
  models: RlhfModelRecord[]
  count: number
}

export type RlhfModelApprovalPayload = {
  approved_by: string
}

export type RlhfTrainingStatus = {
  model_id: string | null
  version: string | null
  training_job_arn: string | null
  records: number
  status: string
}
