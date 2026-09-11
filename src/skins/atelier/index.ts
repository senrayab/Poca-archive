import { Archive } from './Archive'
import { Header } from './Header'
import { Nav } from './Nav'
import type { Layout } from '../types'

/** 작품 목록. 타이포가 주인공이고, 층은 선으로 가른다. */
export const atelier: Layout = { Header, Archive, Nav, detailAsPage: true }
