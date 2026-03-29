FROM ruby:3.4.9-slim

RUN apt-get update -qq && \
    apt-get install --no-install-recommends -y \
    build-essential \
    curl \
    git \
    libpq-dev \
    libyaml-dev \
    pkg-config \
    && rm -rf /var/lib/apt/lists/*

# Install Node.js 22.x LTS
RUN curl -fsSL https://deb.nodesource.com/setup_22.x | bash - && \
    apt-get install --no-install-recommends -y nodejs && \
    npm install -g yarn && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install Ruby dependencies
COPY Gemfile Gemfile.lock ./
RUN bundle install

COPY . .

# Install JS dependencies if package.json exists
RUN if [ -f package.json ]; then yarn install; fi

EXPOSE 3100 3036

CMD ["bin/dev"]
