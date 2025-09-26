/**
 * Generic object pooling system for efficient memory management
 * Implements the optimization strategy from PIXI_OPTIMIZATION_ANALYSIS.md
 * 
 * Object pooling reduces garbage collection overhead by reusing objects
 * instead of creating and destroying them frequently.
 */

export interface Poolable {
    /**
     * Reset the object to its initial state for reuse
     */
    reset(): void;
    
    /**
     * Check if the object is currently in use
     */
    isInUse?: boolean;
}

export class EntityPool<T extends Poolable> {
    private pool: T[];
    private available: T[];
    private createFunction: () => T;
    private maxSize: number;
    private createdCount: number;

    /**
     * Create a new entity pool
     * @param createFunction - Function that creates new instances of the entity
     * @param initialSize - Initial number of entities to create
     * @param maxSize - Maximum number of entities the pool can hold (0 = unlimited)
     */
    constructor(createFunction: () => T, initialSize: number = 0, maxSize: number = 0) {
        this.createFunction = createFunction;
        this.maxSize = maxSize;
        this.pool = [];
        this.available = [];
        this.createdCount = 0;

        // Pre-populate the pool with initial entities
        for (let i = 0; i < initialSize; i++) {
            const entity = this.createFunction();
            entity.reset();
            entity.isInUse = false;
            this.pool.push(entity);
            this.available.push(entity);
            this.createdCount++;
        }

        console.log(`🏊 EntityPool created with ${initialSize} initial entities (max: ${maxSize || 'unlimited'})`);
    }

    /**
     * Acquire an entity from the pool
     * @returns An available entity or a new one if none available
     */
    acquire(): T {
        let entity: T;

        if (this.available.length > 0) {
            // Reuse an available entity
            entity = this.available.pop()!;
            console.log(`♻️ Reusing pooled entity (${this.available.length} remaining)`);
        } else {
            // Create a new entity if none available and within limits
            if (this.maxSize === 0 || this.createdCount < this.maxSize) {
                entity = this.createFunction();
                this.pool.push(entity);
                this.createdCount++;
                console.log(`🆕 Created new pooled entity (total: ${this.createdCount})`);
            } else {
                // Pool is at max capacity, force reuse oldest entity
                entity = this.pool[0];
                console.warn(`⚠️ Pool at max capacity (${this.maxSize}), force reusing entity`);
            }
        }

        entity.isInUse = true;
        return entity;
    }

    /**
     * Release an entity back to the pool
     * @param entity - The entity to release
     */
    release(entity: T): void {
        if (!entity || entity.isInUse === false) {
            console.warn('⚠️ Attempting to release entity that is not in use');
            return;
        }

        // Reset the entity to clean state
        entity.reset();
        entity.isInUse = false;

        // Return to available pool if not already there
        if (!this.available.includes(entity)) {
            this.available.push(entity);
            console.log(`🔄 Entity released to pool (${this.available.length} available)`);
        }
    }

    /**
     * Get pool statistics for monitoring
     */
    getStats() {
        return {
            totalCreated: this.createdCount,
            totalInPool: this.pool.length,
            available: this.available.length,
            inUse: this.pool.length - this.available.length,
            maxSize: this.maxSize,
            utilizationPercent: this.pool.length > 0 ? 
                Math.round(((this.pool.length - this.available.length) / this.pool.length) * 100) : 0
        };
    }

    /**
     * Clear the entire pool and destroy all entities
     */
    clear(): void {
        console.log('🗑️ Clearing entity pool...');
        
        // Reset all entities before clearing
        for (const entity of this.pool) {
            if (entity.reset) {
                entity.reset();
            }
        }

        this.pool.length = 0;
        this.available.length = 0;
        this.createdCount = 0;
        
        console.log('✅ Entity pool cleared');
    }

    /**
     * Get the number of entities currently in use
     */
    getInUseCount(): number {
        return this.pool.length - this.available.length;
    }

    /**
     * Get the number of available entities
     */
    getAvailableCount(): number {
        return this.available.length;
    }

    /**
     * Check if the pool is at maximum capacity
     */
    isAtMaxCapacity(): boolean {
        return this.maxSize > 0 && this.createdCount >= this.maxSize;
    }
}

/**
 * Pool manager for handling multiple entity pools
 */
export class PoolManager {
    private static instance: PoolManager;
    private pools: Map<string, EntityPool<any>>;

    private constructor() {
        this.pools = new Map();
    }

    static getInstance(): PoolManager {
        if (!PoolManager.instance) {
            PoolManager.instance = new PoolManager();
        }
        return PoolManager.instance;
    }

    /**
     * Register a new pool
     * @param name - Unique name for the pool
     * @param pool - The entity pool instance
     */
    registerPool<T extends Poolable>(name: string, pool: EntityPool<T>): void {
        this.pools.set(name, pool);
        console.log(`📝 Registered pool: ${name}`);
    }

    /**
     * Get a pool by name
     * @param name - Name of the pool
     * @returns The entity pool or undefined
     */
    getPool<T extends Poolable>(name: string): EntityPool<T> | undefined {
        return this.pools.get(name);
    }

    /**
     * Get statistics for all pools
     */
    getAllPoolStats(): Record<string, any> {
        const stats: Record<string, any> = {};
        for (const [name, pool] of this.pools) {
            stats[name] = pool.getStats();
        }
        return stats;
    }

    /**
     * Clear all pools
     */
    clearAllPools(): void {
        console.log('🧹 Clearing all entity pools...');
        for (const pool of this.pools.values()) {
            pool.clear();
        }
        console.log('✅ All entity pools cleared');
    }
}

// Export singleton instance
export const poolManager = PoolManager.getInstance();
