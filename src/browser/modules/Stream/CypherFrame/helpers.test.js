/*
 * Copyright (c) 2002-2017 "Neo Technology,"
 * Network Engine for Objects in Lund AB [http://neotechnology.com]
 *
 * This file is part of Neo4j.
 *
 * Neo4j is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */

/* global describe, test, expect */
import { v1 as neo4j } from 'neo4j-driver-alias'
import * as viewTypes from 'shared/modules/stream/frameViewTypes'
import {
  resultHasNodes,
  resultHasRows,
  resultHasWarnings,
  resultHasPlan,
  resultIsError,
  getRecordsToDisplayInTable,
  initialView
} from './helpers'

describe('helpers', () => {
  test('getRecordsToDisplayInTable should report if there are rows or not in the result', () => {
    // Given
    const maxRows = 2
    const items = [
      { request: { result: null }, expect: 0 },
      { request: { result: { records: [] } }, expect: 0 },
      { request: { result: { records: [1, 2] } }, expect: 2 },
      { request: { result: { records: [1, 2, 3] } }, expect: 2 }
    ]
    // When
    // Then
    items.forEach((item) => {
      expect(getRecordsToDisplayInTable(item.request.result, maxRows).length).toEqual(item.expect)
    })
  })
  test('resultHasRows should report if there are rows or not in the result', () => {
    // Given
    const items = [
      { request: null, expect: false },
      { request: { result: null }, expect: false },
      { request: { result: { records: [] } }, expect: false },
      { request: { result: { records: true } }, expect: false },
      { request: { result: { records: [1, 2] } }, expect: true },
      { request: { result: { records: ['string'] } }, expect: true }
    ]
    // When
    // Then
    items.forEach((item) => {
      expect(resultHasRows(item.request)).toEqual(item.expect)
    })
  })
  test('resultHasWarnings should report if there are warnings or not in the result', () => {
    // Given
    const items = [
      { request: null, expect: false },
      { request: { result: null }, expect: false },
      { request: { result: true }, expect: false },
      { request: { result: { summary: true } }, expect: false },
      { request: { result: { summary: {} } }, expect: false },
      { request: { result: { summary: { notifications: null } } }, expect: false },
      { request: { result: { summary: { notifications: true } } }, expect: false },
      { request: { result: { summary: { notifications: [] } } }, expect: false },
      { request: { result: { summary: { notifications: ['yes!'] } } }, expect: true }
    ]
    // When
    // Then
    items.forEach((item) => {
      expect(resultHasWarnings(item.request)).toEqual(item.expect)
    })
  })
  test('resultHasPlan should report if there are a plan or not in the result', () => {
    // Given
    const items = [
      { request: null, expect: false },
      { request: { result: null }, expect: false },
      { request: { result: true }, expect: false },
      { request: { result: { summary: true } }, expect: false },
      { request: { result: { summary: {} } }, expect: false },
      { request: { result: { summary: { plan: null } } }, expect: false },
      { request: { result: { summary: { profile: null } } }, expect: false },
      { request: { result: { summary: { plan: {} } } }, expect: true },
      { request: { result: { summary: { profile: {} } } }, expect: true }
    ]
    // When
    // Then
    items.forEach((item) => {
      expect(resultHasPlan(item.request)).toEqual(item.expect)
    })
  })
  test('resultIsError should report if the result looks like an error', () => {
    // Given
    const items = [
      { request: null, expect: false },
      { request: { result: null }, expect: false },
      { request: { result: true }, expect: false },
      { request: { result: { code: 1 } }, expect: true }
    ]
    // When
    // Then
    items.forEach((item) => {
      expect(resultIsError(item.request)).toEqual(item.expect)
    })
  })
  describe('resultHasNodes', () => {
    test('should return false if no request', () => {
      // Given
      const request = undefined

      // When
      const hasNodes = resultHasNodes(request)

      // Then
      expect(hasNodes).toEqual(false)
    })
    test('should return false if no result', () => {
      // Given
      const request = { result: undefined }

      // When
      const hasNodes = resultHasNodes(request)

      // Then
      expect(hasNodes).toEqual(false)
    })
    test('should return false if no nodes are found', () => {
      // Given
      const mappedGet = (map) => (key) => map[key]
      const request = {
        result: {
          records: [
            {
              keys: ['name', 'city'],
              get: mappedGet({name: 'Oskar', city: 'Borås'})
            },
            {
              keys: ['name', 'city'],
              get: mappedGet({name: 'Stella', city: 'Borås'})
            }
          ]
        }
      }

      // When
      const hasNodes = resultHasNodes(request, neo4j.types)

      // Then
      expect(hasNodes).toEqual(false)
    })
    test('should return true if nodes are found, even nested', () => {
      // Given
      let node = new neo4j.types.Node('2', ['Movie'], {prop2: 'prop2'})
      const mappedGet = (map) => (key) => map[key]
      const request = {
        result: {
          records: [
            {
              keys: ['name', 'maybeNode'],
              get: mappedGet({name: 'Oskar', maybeNode: false})
            },
            {
              keys: ['name', 'maybeNode'],
              get: mappedGet({name: 'Stella', maybeNode: { deeper: [1, node] }})
            }
          ]
        }
      }

      // When
      const hasNodes = resultHasNodes(request, neo4j.types)

      // Then
      expect(hasNodes).toEqual(true)
    })
  })
  describe('initialView', () => {
    test('should return error view if error', () => {
      // Given
      const props = {
        request: {
          status: 'error'
        }
      }
      const state = {}

      // When
      const view = initialView(props, state)

      // Then
      expect(view).toEqual(viewTypes.ERRORS)
    })
    test('should return the forced view if existent', () => {
      // Given
      const props = {
        request: {
          status: 'error'
        },
        frame: {
          forceView: viewTypes.WARNINGS
        }
      }
      const state = {}

      // When
      const view = initialView(props, state)

      // Then
      expect(view).toEqual(viewTypes.WARNINGS)
    })
    test('should return the plan view if plan is existent', () => {
      // Given
      const props = {
        request: {
          result: {
            summary: {
              plan: {}
            }
          }
        }
      }
      const state = {}

      // When
      const view = initialView(props, state)

      // Then
      expect(view).toEqual(viewTypes.PLAN)
    })
    test('should return the plan view if profile is existent', () => {
      // Given
      const props = {
        request: {
          result: {
            summary: {
              profile: {}
            }
          }
        }
      }
      const state = {}

      // When
      const view = initialView(props, state)

      // Then
      expect(view).toEqual(viewTypes.PLAN)
    })
    test('should return the viz view if nodes are existent', () => {
      // Given
      let node = new neo4j.types.Node('2', ['Movie'], {prop2: 'prop2'})
      const mappedGet = (map) => (key) => map[key]
      const request = {
        result: {
          records: [
            {
              keys: ['name', 'maybeNode'],
              get: mappedGet({name: 'Oskar', maybeNode: false})
            },
            {
              keys: ['name', 'maybeNode'],
              get: mappedGet({name: 'Stella', maybeNode: { deeper: [1, node] }})
            }
          ]
        }
      }
      const props = { request }
      const state = {}

      // When
      const view = initialView(props, state)

      // Then
      expect(view).toEqual(viewTypes.VISUALIZATION)
    })
    test('should return the table view if nodes are not existent', () => {
      // Given
      const mappedGet = (map) => (key) => map[key]
      const request = {
        result: {
          records: [
            {
              keys: ['name', 'maybeNode'],
              get: mappedGet({name: 'Oskar', maybeNode: false})
            },
            {
              keys: ['name', 'maybeNode'],
              get: mappedGet({name: 'Stella', maybeNode: false})
            }
          ]
        }
      }
      const props = { request }
      const state = {}

      // When
      const view = initialView(props, state)

      // Then
      expect(view).toEqual(viewTypes.TABLE)
    })
    test('should return the table view no rows', () => {
      // Given
      const request = {
        result: {
          records: []
        }
      }
      const props = { request }
      const state = {}

      // When
      const view = initialView(props, state)

      // Then
      expect(view).toEqual(viewTypes.TABLE)
    })
    test('should return undefined for pending state', () => {
      // Given
      const request = {
        status: 'pending'
      }
      const props = { request }
      const state = {}

      // When
      const view = initialView(props, state)

      // Then
      expect(view).toEqual(undefined)
    })
    test('should return the ascii if thats the last view', () => {
      // Given
      let node = new neo4j.types.Node('2', ['Movie'], {prop2: 'prop2'})
      const mappedGet = (map) => (key) => map[key]
      const request = {
        result: {
          records: [
            {
              keys: ['name', 'maybeNode'],
              get: mappedGet({name: 'Oskar', maybeNode: false})
            },
            {
              keys: ['name', 'maybeNode'],
              get: mappedGet({name: 'Stella', maybeNode: { deeper: [1, node] }})
            }
          ]
        }
      }
      const props = { request, recentView: viewTypes.TEXT }
      const state = {}

      // When
      const view = initialView(props, state)

      // Then
      expect(view).toEqual(viewTypes.TEXT)
    })
    test('should return the table if viz the last view but no viz elements exists', () => {
      // Given
      const mappedGet = (map) => (key) => map[key]
      const request = {
        result: {
          records: [
            {
              keys: ['name', 'maybeNode'],
              get: mappedGet({name: 'Oskar', maybeNode: false})
            },
            {
              keys: ['name', 'maybeNode'],
              get: mappedGet({name: 'Stella', maybeNode: false})
            }
          ]
        }
      }
      const props = { request, recentView: viewTypes.VISUALIZATION }
      const state = {}

      // When
      const view = initialView(props, state)

      // Then
      expect(view).toEqual(viewTypes.TABLE)
    })
    test('should not change view if state.openView exists', () => {
      // Given
      const mappedGet = (map) => (key) => map[key]
      const request = {
        result: {
          records: [
            {
              keys: ['name', 'maybeNode'],
              get: mappedGet({name: 'Oskar', maybeNode: false})
            },
            {
              keys: ['name', 'maybeNode'],
              get: mappedGet({name: 'Stella', maybeNode: false})
            }
          ]
        }
      }
      const props = { request, recentView: viewTypes.VISUALIZATION }
      const state = { openView: viewTypes.TEXT }

      // When
      const view = initialView(props, state)

      // Then
      expect(view).toEqual(viewTypes.TEXT)
    })
    test('should return viz if the last view was plan but no plan exists and viz elements exists', () => {
      // Given
      let node = new neo4j.types.Node('2', ['Movie'], {prop2: 'prop2'})
      const mappedGet = (map) => (key) => map[key]
      const request = {
        result: {
          records: [
            {
              keys: ['name', 'maybeNode'],
              get: mappedGet({name: 'Oskar', maybeNode: false})
            },
            {
              keys: ['name', 'maybeNode'],
              get: mappedGet({name: 'Stella', maybeNode: { deeper: [1, node] }})
            }
          ]
        }
      }
      const props = { request, recentView: viewTypes.PLAN }
      const state = {}

      // When
      const view = initialView(props, state)

      // Then
      expect(view).toEqual(viewTypes.VISUALIZATION)
    })
    test('should return table if the last view was plan but no plan exists and no viz elements exists', () => {
      // Given
      const mappedGet = (map) => (key) => map[key]
      const request = {
        result: {
          records: [
            {
              keys: ['name', 'maybeNode'],
              get: mappedGet({name: 'Oskar', maybeNode: false})
            },
            {
              keys: ['name', 'maybeNode'],
              get: mappedGet({name: 'Stella', maybeNode: { deeper: [1, 2] }})
            }
          ]
        }
      }
      const props = { request, recentView: viewTypes.PLAN }
      const state = {}

      // When
      const view = initialView(props, state)

      // Then
      expect(view).toEqual(viewTypes.TABLE)
    })
  })
})
