import { Archive, Grid } from './Archive'
import { Backdrop } from './Backdrop'
import { Header } from './Header'
import { Nav } from './Nav'
import type { Layout } from '../types'

/** 밤에 보는 사진첩. 오른쪽 세로 기둥이 길을 맡는다. */
export const nocturne: Layout = { Header, Archive, Grid, Nav, Backdrop, detailAsPage: true }
