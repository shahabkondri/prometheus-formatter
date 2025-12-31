# Prometheus Formatter

<div align="center"><img alt="Prometheus Formatter for Safari" src="/etc/prometheus-formatter-128.png"/></div>

<div align="center">
    <a href="https://apps.apple.com/ca/app/prometheus-formatter/id6738227397?mt=12">
        <img alt="Download on the App Store" src="/etc/download_on_the_app_store_badge.svg"/>
    </a>
</div>

Prometheus Formatter **is** a Safari Web Extension designed to enhance the readability of Prometheus metrics by
detecting and highlighting them directly within your browser. Whether you're monitoring applications, debugging, or
analyzing metrics, Prometheus Formatter provides a cleaner and more intuitive view of your Prometheus data.

## Features

- **Automatic Detection**: Identifies Prometheus/OpenMetrics endpoints on any webpage.
- **Family View + Metadata**: Groups samples by metric family and surfaces HELP/TYPE/UNIT metadata with series counts.
- **Sidebar Navigation**: Jump between families with a collapsible, resizable sidebar.
- **View Modes**: Toggle between Formatted, Flat (virtualized list), and Raw views.
- **Theme Picker**: Choose from 14 curated light/dark themes.
- **Search & Filter**: Search across names, labels, values, timestamps, exemplars, and raw text with highlighted matches.
- **Large-Payload Friendly**: Streaming parsing and virtualization keep big payloads responsive, with size guardrails.

## What's New in v2

- **New Parser**: Full line validation with OpenMetrics extras (UNIT and exemplars) plus parse warnings for malformed lines.
- **New Layout**: Metrics grouped into families with metadata pills and a searchable sidebar navigator.
- **View Toggle**: Formatted, Flat, and Raw views with virtualized rendering for large endpoints.
- **Expanded Themes**: Theme menu with 14 palettes across light and dark variants.

### Preview

![Prometheus Formatter Preview](/etc/prometheus-formatter.gif)
