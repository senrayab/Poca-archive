import { Archive } from './Archive'
import { Header } from './Header'
import { Nav } from './Nav'
import type { Layout } from '../types'

/** 유리 진열장. 카드가 서리유리 슬리브에 꽂혀 있다. */
export const prism: Layout = { Header, Archive, Nav, detailAsPage: true }
