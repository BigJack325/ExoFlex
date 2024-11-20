# Stage 1: Build Stage
FROM ubuntu:latest AS builder
ENV DEBIAN_FRONTEND=noninteractive

ARG BUILD_DATE
ARG GIT_SHA

LABEL org.opencontainers.image.created="${BUILD_DATE}"
LABEL org.opencontainers.image.revision="${GIT_SHA}"
LABEL org.opencontainers.image.version="${BUILD_DATE}"

# Install dependencies
RUN apt-get update && apt-get install -y \
    curl \
    git \
    && curl -fsSL https://deb.nodesource.com/setup_18.x | bash - \
    && apt-get install -y nodejs \
    && npm install -g yarn \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/* \
    && rm -rf /var/cache/apt/*

WORKDIR /app

# Cache dependencies
COPY package.json yarn.lock ./
RUN yarn install

# Copy and build application
COPY . .
RUN yarn build

# Stage 2: Production Stage
FROM ubuntu:latest
ENV DEBIAN_FRONTEND=noninteractive

# Install runtime dependencies
RUN apt-get update && apt-get install -y \
    curl \
    git \
    && curl -fsSL https://deb.nodesource.com/setup_18.x | bash - \
    && apt-get install -y nodejs \
    && npm install -g yarn \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/* \
    && rm -rf /var/cache/apt/*

WORKDIR /app

# Copy application files from build stage
COPY package.json yarn.lock ./
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/public ./public
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/src ./src

# Create non-root user for security
# RUN groupadd -g 984 docker && \
#     useradd -m -s /bin/bash nodeuser && \
#     usermod -aG docker nodeuser && \
#     chown -R nodeuser:docker /app

# Expose ports
EXPOSE 1338
EXPOSE 3001

# Run as non-root user
# USER nodeuser
CMD ["yarn", "start"]