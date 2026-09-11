import { Archive, Grid } from './Archive'
import { Header } from './Header'
import { Nav } from './Nav'
import type { Layout } from '../types'

/** 흰 벽에 걸린 것들. 층을 가르는 것은 여백뿐이고, 늘 밝게 간다. */
export const blank: Layout = { Header, Archive, Grid, Nav, detailAsPage: true }
