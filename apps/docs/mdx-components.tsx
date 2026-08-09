import defaultMdxComponents from 'fumadocs-ui/mdx';
import { Tab, Tabs } from 'fumadocs-ui/components/tabs';
import { Callout } from 'fumadocs-ui/components/callout';
import { Step, Steps } from 'fumadocs-ui/components/steps';
import { Card, Cards } from 'fumadocs-ui/components/card';
import type { MDXComponents } from 'mdx/types';
import { WidgetPlayground } from '@/components/WidgetPlayground';
import { ApiPlayground } from '@/components/ApiPlayground';

/**
 * Components available to every MDX page. The live playgrounds are exposed here
 * so a page can drop `<WidgetPlayground />` / `<ApiPlayground />` inline.
 */
export function getMDXComponents(components?: MDXComponents): MDXComponents {
  return {
    ...defaultMdxComponents,
    Tab,
    Tabs,
    Callout,
    Step,
    Steps,
    Card,
    Cards,
    WidgetPlayground,
    ApiPlayground,
    ...components,
  };
}
