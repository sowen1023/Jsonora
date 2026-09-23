export type JsonKind = 'object' | 'array' | 'string' | 'number' | 'boolean' | 'null'

/**
 * One row of the flattened tree. The model keeps every node in a flat array indexed by
 * `id`, so rows can be addressed by number and virtualised without pointer chasing.
 */
export interface JsonNode {
  id: number
  /** Parent node id; `-1` for the (never rendered) virtual root. */
  parent: number
  /** Object key, or `null` for array elements and the root. */
  key: string | null
  /** Array index, or `-1` when the node is not an array element. */
  index: number
  kind: JsonKind
  /** `0` for top-level members; the virtual root sits at `-1`. */
  depth: number
  isLast: boolean
  /** Number of children for containers, `0` for primitives. */
  size: number
  /** Child ids once materialised, `null` while still lazy. */
  children: number[] | null
  /** The underlying JSON value — for containers this is the original parsed reference. */
  raw: unknown
  /** Display text for primitives. */
  text: string
}

export interface ViewerStats {
  bytes: number
  nodes: number
  depth: number
  ms: number
  rootKind: JsonKind
}
