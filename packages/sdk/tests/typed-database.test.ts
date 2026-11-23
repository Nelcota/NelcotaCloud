import { describe, expect, expectTypeOf, it } from 'vitest'

import { createClient, memoryStorage } from '../src/index'
import type { QueryResult } from '../src/index'
import { FakeApi } from './fake-api'

/** The shape `nelcota gen types` writes. */
type Database = {
  public: {
    Tables: {
      orders: {
        Row: { id: number; title: string; note: string | null }
        Insert: { id?: number; title: string; note?: string | null }
        Update: { id?: number; title?: string; note?: string | null }
      }
    }
    Views: {
      open_orders: { Row: { id: number; title: string } }
    }
    Functions: {
      order_count: { Args: { minimum?: number }; Returns: number }
    }
    Enums: { [_ in never]: never }
  }
}

describe('typed database client', () => {
  it('types names, rows, writes and functions from the generated Database', async () => {
    const api = new FakeApi()
    const client = createClient<Database>({
      url: 'https://api.test',
      publishableKey: 'nc_pk_test',
      storage: memoryStorage(),
      fetch: api.fetch,
    })
    api.reply('GET /rest/v1/orders', { status: 200, body: [{ id: 1, title: 'A', note: null }] })
    api.reply('POST /rest/v1/rpc/order_count', { status: 200, body: 1 })

    const rows = await client.from('orders').select().execute()
    const count = await client.rpc('order_count', { minimum: 1 })

    expect(rows.data).toEqual([{ id: 1, title: 'A', note: null }])
    expect(count.data).toBe(1)
    expectTypeOf(rows.data).toEqualTypeOf<Database['public']['Tables']['orders']['Row'][]>()
    expectTypeOf(count).toEqualTypeOf<QueryResult<number>>()
    expectTypeOf(client.from('orders').insert)
      .parameter(0)
      .toEqualTypeOf<
        | Database['public']['Tables']['orders']['Insert']
        | Database['public']['Tables']['orders']['Insert'][]
      >()
    expectTypeOf(client.from).parameter(0).toEqualTypeOf<'orders' | 'open_orders'>()
  })
})
