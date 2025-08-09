import { MediaRequestStatus } from '@server/constants/media';
import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { MediaRequest } from './MediaRequest';
import { EpisodeRequest } from './EpisodeRequest';

@Entity()
class SeasonRequest {
  @PrimaryGeneratedColumn()
  public id: number;

  @Column()
  public seasonNumber: number;

  @Column({ type: 'int', default: MediaRequestStatus.PENDING })
  public status: MediaRequestStatus;

  @ManyToOne(() => MediaRequest, (request) => request.seasons, {
    onDelete: 'CASCADE',
  })
  public request: MediaRequest;

  @CreateDateColumn()
  public createdAt: Date;

  @UpdateDateColumn()
  public updatedAt: Date;

  @OneToMany(() => EpisodeRequest, (episodeRequest) => episodeRequest.season, {
    cascade: true,
    eager: true,
  })
  episodes: EpisodeRequest[];

  constructor(init?: Partial<SeasonRequest>) {
    Object.assign(this, init);
  }
}

export default SeasonRequest;
