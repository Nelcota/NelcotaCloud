import { describe, expect, it } from 'vitest'

import { destructiveStatements } from '@/modules/sql-editor/components/destructive-statement'

describe('destructiveStatements', () => {
  it('names the statements that erase data, once each', () => {
    const sql = 'drop table a; truncate b; DELETE FROM c; update d set x = 1; drop view e'

    expect(destructiveStatements(sql)).toEqual([
      'DROP',
      'TRUNCATE',
      'DELETE sem WHERE',
      'UPDATE sem WHERE',
    ])
  })

  it('lets reads and filtered writes run without asking', () => {
    const sql = `select * from a; delete from b where id = 1;
      update c set x = 1 where id = 2; create table d (id int)`

    expect(destructiveStatements(sql)).toEqual([])
  })

  it('ignores a where hidden in a string or comment', () => {
    expect(destructiveStatements('delete from a -- where id = 1\n')).toEqual(['DELETE sem WHERE'])
    expect(destructiveStatements("update a set note = ' where '")).toEqual(['UPDATE sem WHERE'])
  })

  it('catches a dropped column', () => {
    expect(destructiveStatements('alter table a drop column b')).toEqual(['ALTER TABLE … DROP'])
  })
})
